#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

DEFAULT_ENV_FILE=".env.prod"
ENV_FILE="${DEFAULT_ENV_FILE}"
NO_BUILD=0
SKIP_SEED=0

usage() {
  cat <<'EOF'
Usage: ./ops/deploy.sh [options]

Options:
  --no-build           Run deploy without --build
  --skip-seed          Skip seed_demo_users regardless of backend/.env.prod
  --env-file <path>    Compose env file path (default: .env.prod)
  -h, --help           Show this help
EOF
}

log() {
  printf '[deploy] %s\n' "$1"
}

warn() {
  printf '[warn] %s\n' "$1"
}

die() {
  printf '[error] %s\n' "$1" >&2
  exit 1
}

resolve_path() {
  local path="$1"

  if [[ "$path" = /* ]]; then
    printf '%s\n' "$path"
    return
  fi

  printf '%s\n' "${ROOT_DIR}/${path}"
}

read_env_value() {
  local file_path="$1"
  local key="$2"
  local raw_line
  local clean_line

  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    clean_line="${raw_line%%#*}"
    clean_line="${clean_line%$'\r'}"

    clean_line="${clean_line#${clean_line%%[![:space:]]*}}"
    clean_line="${clean_line%${clean_line##*[![:space:]]}}"

    if [[ -z "$clean_line" ]]; then
      continue
    fi

    if [[ "$clean_line" == export\ * ]]; then
      clean_line="${clean_line#export }"
      clean_line="${clean_line#${clean_line%%[![:space:]]*}}"
    fi

    if [[ "$clean_line" != "${key}="* ]]; then
      continue
    fi

    raw_line="${clean_line#*=}"
    raw_line="${raw_line#${raw_line%%[![:space:]]*}}"
    raw_line="${raw_line%${raw_line##*[![:space:]]}}"

    if [[ "$raw_line" =~ ^\".*\"$ ]] || [[ "$raw_line" =~ ^\'.*\'$ ]]; then
      raw_line="${raw_line:1:${#raw_line}-2}"
    fi

    printf '%s\n' "$raw_line"
    return
  done <"$file_path"

  printf '\n'
}

ensure_env_file() {
  local target="$1"
  local example="$2"

  if [[ -f "$target" ]]; then
    return
  fi

  [[ -f "$example" ]] || die "Missing example file: ${example}"
  cp "$example" "$target"
  warn "Created ${target} from ${example}. Edit secrets before exposing this environment."
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --no-build)
      NO_BUILD=1
      shift
      ;;
    --skip-seed)
      SKIP_SEED=1
      shift
      ;;
    --env-file)
      [[ "${2:-}" != "" ]] || die "--env-file requires a value"
      ENV_FILE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

command -v docker >/dev/null 2>&1 || die "docker is required"
docker compose version >/dev/null 2>&1 || die "docker compose plugin is required"

ENV_FILE_PATH="$(resolve_path "$ENV_FILE")"
DEFAULT_ENV_FILE_PATH="${ROOT_DIR}/.env.prod"
BACKEND_ENV_FILE_PATH="${ROOT_DIR}/backend/.env.prod"

ensure_env_file "$DEFAULT_ENV_FILE_PATH" "${ROOT_DIR}/.env.prod.example"
ensure_env_file "$BACKEND_ENV_FILE_PATH" "${ROOT_DIR}/backend/.env.prod.example"

if [[ ! -f "$ENV_FILE_PATH" ]]; then
  die "Env file not found: ${ENV_FILE_PATH}"
fi

COMPOSE_ARGS=(--env-file "$ENV_FILE_PATH" -f docker-compose.yml -f docker-compose.prod.yml)

log "Deploying from ${ROOT_DIR}"
log "Using env file: ${ENV_FILE_PATH}"

if [[ "$NO_BUILD" -eq 1 ]]; then
  docker compose "${COMPOSE_ARGS[@]}" up -d
else
  docker compose "${COMPOSE_ARGS[@]}" up -d --build
fi

log "Running post-deploy migrate"
docker compose "${COMPOSE_ARGS[@]}" exec -T backend python manage.py migrate

SEED_DEMO_USERS_VALUE="$(read_env_value "$BACKEND_ENV_FILE_PATH" "SEED_DEMO_USERS")"

if [[ "$SKIP_SEED" -eq 1 ]]; then
  log "Skipping seed_demo_users (--skip-seed)"
elif [[ "$SEED_DEMO_USERS_VALUE" == "1" ]]; then
  log "Running seed_demo_users (SEED_DEMO_USERS=1)"
  docker compose "${COMPOSE_ARGS[@]}" exec -T backend python manage.py seed_demo_users
else
  log "Skipping seed_demo_users (SEED_DEMO_USERS is not 1 in backend/.env.prod)"
fi

NGINX_PORT_VALUE="$(read_env_value "$ENV_FILE_PATH" "NGINX_PORT")"
NGINX_PORT="${NGINX_PORT_VALUE:-8073}"
BASE_URL="http://localhost:${NGINX_PORT}"

log "Running health checks"
curl -fsS "${BASE_URL}/healthz" >/dev/null
curl -fsS "${BASE_URL}/api/health" >/dev/null

printf '\n'
printf 'Deployment completed successfully.\n'
printf 'URLs:\n'
printf '  App: %s\n' "${BASE_URL}"
printf '  Nginx health: %s/healthz\n' "${BASE_URL}"
printf '  API health: %s/api/health\n' "${BASE_URL}"
printf '\n'
printf 'Useful commands:\n'
printf '  docker compose --env-file %s -f docker-compose.yml -f docker-compose.prod.yml logs -f\n' "$ENV_FILE_PATH"
printf '  docker compose --env-file %s -f docker-compose.yml -f docker-compose.prod.yml ps\n' "$ENV_FILE_PATH"
printf '  docker compose --env-file %s -f docker-compose.yml -f docker-compose.prod.yml down\n' "$ENV_FILE_PATH"
