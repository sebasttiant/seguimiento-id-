#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${APP_DIR:-$DEFAULT_APP_DIR}"

DEFAULT_ENV_FILE=".env.prod"
ENV_FILE="${DEFAULT_ENV_FILE}"
REMOTE_NAME="${DEPLOY_REMOTE:-origin}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-}"
NO_BUILD=0
SKIP_SEED=0
SKIP_PULL=0
SKIP_BACKUP=0
ALLOW_DIRTY_WORKTREE="${ALLOW_DIRTY_WORKTREE:-0}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-120}"
SERVICE_TIMEOUT_SECONDS="${SERVICE_TIMEOUT_SECONDS:-180}"

usage() {
  cat <<'EOF'
Usage: ./ops/deploy.sh [options]

Options:
  --no-build           Run deploy without building Docker images
  --skip-seed          Skip seed_demo_users regardless of backend/.env.prod
  --skip-pull          Skip git fetch/pull (useful for local validation)
  --skip-backup        Skip source backup before pull
  --allow-dirty        Allow deploy with local uncommitted changes (unsafe; also ALLOW_DIRTY_WORKTREE=1)
  --env-file <path>    Compose env file path (default: .env.prod)
  --branch <name>      Git branch to deploy (default: current branch, fallback: main)
  -h, --help           Show this help

Environment overrides:
  APP_DIR              Application checkout directory (default: parent of ops/)
  DEPLOY_REMOTE        Git remote name (default: origin)
  DEPLOY_BRANCH        Git branch to deploy (same as --branch)
  HEALTH_TIMEOUT_SECONDS, SERVICE_TIMEOUT_SECONDS
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

  printf '%s\n' "${APP_DIR}/${path}"
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

require_file() {
  local file_path="$1"
  [[ -f "$file_path" ]] || die "Required file not found: ${file_path}"
}

require_production_env_file() {
  local file_path="$1"
  local label="$2"

  [[ -f "$file_path" ]] || die "Missing ${label}: ${file_path}. Create it manually from the example, replace every placeholder secret/domain, then re-run deploy. Production deploy never bootstraps env files automatically."
}

is_placeholder_value() {
  local key="$1"
  local value="$2"
  local lower_value

  lower_value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"

  [[ -n "$value" ]] || return 0
  [[ "$lower_value" != *change_me* ]] || return 0
  [[ "$lower_value" != *change-me* ]] || return 0
  [[ "$lower_value" != *replace-with* ]] || return 0
  [[ "$lower_value" != *example.com* ]] || return 0

  case "$key" in
    SECRET_KEY)
      [[ "$lower_value" != django-insecure-* ]] || return 0
      [[ "${#value}" -ge 32 ]] || return 0
      ;;
    POSTGRES_PASSWORD)
      case "$lower_value" in
        tasktracking|postgres|password|admin|changeme|secret)
          return 0
          ;;
      esac
      ;;
  esac

  return 1
}

validate_env_value() {
  local file_path="$1"
  local key="$2"
  local value

  value="$(read_env_value "$file_path" "$key")"

  [[ -n "$value" ]] || die "${file_path} is missing required production value: ${key}"

  if is_placeholder_value "$key" "$value"; then
    die "${file_path} contains an unsafe placeholder/default production value for ${key}. Replace it before deploy."
  fi
}

validate_production_env_files() {
  local compose_env_file="$1"
  local backend_env_file="$2"

  validate_env_value "$compose_env_file" "POSTGRES_PASSWORD"
  validate_env_value "$backend_env_file" "SECRET_KEY"
  validate_env_value "$backend_env_file" "POSTGRES_PASSWORD"
  validate_env_value "$backend_env_file" "ALLOWED_HOSTS"
  validate_env_value "$backend_env_file" "CORS_ALLOWED_ORIGINS"
  validate_env_value "$backend_env_file" "CSRF_TRUSTED_ORIGINS"
}

ensure_clean_worktree() {
  local status_output

  command -v git >/dev/null 2>&1 || die "git is required for dirty worktree checks"
  [[ -d "${APP_DIR}/.git" ]] || die "APP_DIR is not a git checkout: ${APP_DIR}"

  if [[ "$ALLOW_DIRTY_WORKTREE" == "1" || "$ALLOW_DIRTY_WORKTREE" == "true" ]]; then
    warn "Dirty worktree guard bypassed by --allow-dirty/ALLOW_DIRTY_WORKTREE. Deploying uncommitted code is unsafe."
    return
  fi

  status_output="$(git -C "$APP_DIR" status --porcelain --untracked-files=all)"
  [[ -z "$status_output" ]] || die "Refusing deploy with a dirty worktree. Commit/stash changes first, or set ALLOW_DIRTY_WORKTREE=1 / pass --allow-dirty after deliberately accepting the risk."
}

compose() {
  docker compose "${COMPOSE_ARGS[@]}" "$@"
}

print_compose_status() {
  printf '\n'
  log "Docker Compose status"
  compose ps || true
}

print_failure_logs() {
  local exit_code=$?

  if [[ "$exit_code" -eq 0 ]]; then
    return
  fi

  printf '\n' >&2
  warn "Deploy failed. Recent service logs:" >&2
  compose ps >&2 || true
  compose logs --tail=80 postgres redis backend frontend nginx >&2 || true
}

backup_source() {
  local backup_root="${APP_DIR}/ops/backups/source"
  local stamp
  local archive_path

  command -v tar >/dev/null 2>&1 || die "tar is required for source backups"
  stamp="$(date +%Y%m%d_%H%M%S)"
  archive_path="${backup_root}/source_${stamp}.tar.gz"

  mkdir -p "$backup_root"
  log "Creating source backup: ${archive_path}"

  tar -czf "$archive_path" \
    --exclude='./.git' \
    --exclude='./.atl' \
    --exclude='./.venv' \
    --exclude='./venv' \
    --exclude='./node_modules' \
    --exclude='./frontend/node_modules' \
    --exclude='./dist' \
    --exclude='./frontend/dist' \
    --exclude='./build' \
    --exclude='./frontend/build' \
    --exclude='./.cache' \
    --exclude='./.pytest_cache' \
    --exclude='./backend/.pytest_cache' \
    --exclude='./backend/staticfiles' \
    --exclude='./backend/media' \
    --exclude='./media' \
    --exclude='./ops/backups' \
    -C "$APP_DIR" .
}

backup_postgres() {
  local backup_root="${APP_DIR}/ops/backups/postgres"
  local stamp
  local backup_path
  local tmp_path

  stamp="$(date +%Y%m%d_%H%M%S)"
  backup_path="${backup_root}/postgres_prod_${stamp}.dump"
  tmp_path="${backup_path}.tmp"

  mkdir -p "$backup_root"
  log "Creating PostgreSQL backup before migrations: ${backup_path}"

  if ! compose exec -T postgres sh -c 'pg_dump --format=custom --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >"$tmp_path"; then
    rm -f "$tmp_path"
    die "PostgreSQL backup failed. Migrations were not run."
  fi

  mv "$tmp_path" "$backup_path"
  log "PostgreSQL backup created: ${backup_path}"
  printf 'Restore guidance (review before running):\n'
  printf '  cat %q | docker compose --env-file %q -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres sh -c '\''pg_restore --clean --if-exists --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"'\''\n' "$backup_path" "$ENV_FILE_PATH"
}

resolve_branch() {
  if [[ -n "$DEPLOY_BRANCH" ]]; then
    printf '%s\n' "$DEPLOY_BRANCH"
    return
  fi

  if git -C "$APP_DIR" symbolic-ref --quiet --short HEAD >/dev/null 2>&1; then
    git -C "$APP_DIR" symbolic-ref --quiet --short HEAD
    return
  fi

  printf 'main\n'
}

pull_latest_code() {
  local branch="$1"

  command -v git >/dev/null 2>&1 || die "git is required for deploy pull"
  [[ -d "${APP_DIR}/.git" ]] || die "APP_DIR is not a git checkout: ${APP_DIR}"

  log "Fetching ${REMOTE_NAME}/${branch}"
  git -C "$APP_DIR" fetch "$REMOTE_NAME" "$branch"

  if [[ "$(git -C "$APP_DIR" symbolic-ref --quiet --short HEAD 2>/dev/null || true)" != "$branch" ]]; then
    log "Checking out ${branch}"
    git -C "$APP_DIR" checkout "$branch"
  fi

  log "Pulling ${REMOTE_NAME}/${branch} with --ff-only"
  git -C "$APP_DIR" pull --ff-only "$REMOTE_NAME" "$branch"
}

wait_for_service() {
  local service="$1"
  local timeout_seconds="$2"
  local start_time
  local container_id
  local health_status
  local state_status

  start_time="$(date +%s)"
  log "Waiting for ${service} to become healthy/running (${timeout_seconds}s timeout)"

  while true; do
    container_id="$(compose ps -q "$service" 2>/dev/null || true)"

    if [[ -n "$container_id" ]]; then
      health_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
      state_status="$(docker inspect --format '{{.State.Status}}' "$container_id" 2>/dev/null || true)"

      if [[ "$health_status" == "healthy" ]]; then
        log "${service} is healthy"
        return
      fi

      if [[ -z "$health_status" && "$state_status" == "running" ]]; then
        log "${service} is running"
        return
      fi
    fi

    if (( $(date +%s) - start_time >= timeout_seconds )); then
      compose ps "$service" || true
      die "Timed out waiting for ${service}"
    fi

    sleep 3
  done
}

wait_for_url() {
  local url="$1"
  local timeout_seconds="$2"
  local start_time

  start_time="$(date +%s)"
  log "Waiting for ${url} (${timeout_seconds}s timeout)"

  while true; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "Health check OK: ${url}"
      return
    fi

    if (( $(date +%s) - start_time >= timeout_seconds )); then
      die "Timed out waiting for ${url}"
    fi

    sleep 3
  done
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
    --skip-pull)
      SKIP_PULL=1
      shift
      ;;
    --skip-backup)
      SKIP_BACKUP=1
      shift
      ;;
    --allow-dirty)
      ALLOW_DIRTY_WORKTREE=1
      shift
      ;;
    --env-file)
      [[ "${2:-}" != "" ]] || die "--env-file requires a value"
      ENV_FILE="$2"
      shift 2
      ;;
    --branch)
      [[ "${2:-}" != "" ]] || die "--branch requires a value"
      DEPLOY_BRANCH="$2"
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

APP_DIR="$(cd "$APP_DIR" && pwd)"
cd "$APP_DIR"

command -v docker >/dev/null 2>&1 || die "docker is required"
docker compose version >/dev/null 2>&1 || die "docker compose plugin is required"
command -v curl >/dev/null 2>&1 || die "curl is required"

ENV_FILE_PATH="$(resolve_path "$ENV_FILE")"
DEPLOY_BRANCH="$(resolve_branch)"
BACKEND_ENV_FILE_VALUE="$(read_env_value "$ENV_FILE_PATH" "BACKEND_ENV_FILE_PROD" 2>/dev/null || true)"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE_VALUE:-./backend/.env.prod}"
BACKEND_ENV_FILE_PATH="$(resolve_path "$BACKEND_ENV_FILE")"

log "Deploying from ${APP_DIR}"
log "Branch: ${DEPLOY_BRANCH}"
log "Using env file: ${ENV_FILE_PATH}"
log "Using backend env file: ${BACKEND_ENV_FILE_PATH}"

ensure_clean_worktree

if [[ "$SKIP_BACKUP" -eq 1 ]]; then
  log "Skipping source backup (--skip-backup)"
else
  backup_source
fi

if [[ "$SKIP_PULL" -eq 1 ]]; then
  log "Skipping git pull (--skip-pull)"
else
  pull_latest_code "$DEPLOY_BRANCH"
fi

require_production_env_file "$ENV_FILE_PATH" "Compose env file"
require_production_env_file "$BACKEND_ENV_FILE_PATH" "backend env file from BACKEND_ENV_FILE_PROD"
validate_production_env_files "$ENV_FILE_PATH" "$BACKEND_ENV_FILE_PATH"

COMPOSE_ARGS=(--env-file "$ENV_FILE_PATH" -f docker-compose.yml -f docker-compose.prod.yml)
trap print_failure_logs EXIT

log "Validating Docker Compose production configuration"
compose config --quiet

log "Starting database/cache services first"
compose up -d postgres redis
wait_for_service postgres "$SERVICE_TIMEOUT_SECONDS"
wait_for_service redis "$SERVICE_TIMEOUT_SECONDS"

backup_postgres

if [[ "$NO_BUILD" -eq 1 ]]; then
  log "Skipping Docker image build (--no-build)"
else
  log "Building backend and frontend images"
  compose build backend frontend
fi

log "Running Django migrations"
compose run --rm -e RUN_MIGRATIONS=0 -e COLLECTSTATIC=0 backend python manage.py migrate --noinput

SEED_DEMO_USERS_VALUE="$(read_env_value "$BACKEND_ENV_FILE_PATH" "SEED_DEMO_USERS")"

if [[ "$SKIP_SEED" -eq 1 ]]; then
  log "Skipping seed_demo_users (--skip-seed)"
elif [[ "$SEED_DEMO_USERS_VALUE" == "1" ]]; then
  log "Running seed_demo_users (SEED_DEMO_USERS=1)"
  compose run --rm -e RUN_MIGRATIONS=0 -e COLLECTSTATIC=0 backend python manage.py seed_demo_users
else
  log "Skipping seed_demo_users (SEED_DEMO_USERS is not 1 in ${BACKEND_ENV_FILE_PATH})"
fi

log "Starting application services"
compose up -d backend celery_worker celery_beat frontend nginx
wait_for_service backend "$SERVICE_TIMEOUT_SECONDS"
wait_for_service frontend "$SERVICE_TIMEOUT_SECONDS"

log "Restarting nginx to refresh upstream DNS"
compose restart nginx
wait_for_service nginx "$SERVICE_TIMEOUT_SECONDS"

NGINX_PORT_VALUE="$(read_env_value "$ENV_FILE_PATH" "NGINX_PORT")"
NGINX_PORT="${NGINX_PORT_VALUE:-8073}"
BASE_URL="http://localhost:${NGINX_PORT}"

log "Running HTTP health checks"
wait_for_url "${BASE_URL}/healthz" "$HEALTH_TIMEOUT_SECONDS"
wait_for_url "${BASE_URL}/api/health" "$HEALTH_TIMEOUT_SECONDS"

print_compose_status

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

trap - EXIT
