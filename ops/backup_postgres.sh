#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/ops/backups"
ENVIRONMENT="dev"
RETENTION_DAYS=""

usage() {
  cat <<'EOF'
Usage:
  ./ops/backup_postgres.sh [--env dev|prod] [--output-dir <path>] [--retention-days <N>]

Options:
  --env             Target compose profile (default: dev)
  --output-dir      Backup output directory (default: ./ops/backups)
  --retention-days  Delete old backups older than N days (optional)
  --help            Show this help
EOF
}

ensure_value() {
  flag="$1"
  value="$2"
  if [ -z "$value" ] || [ "${value#--}" != "$value" ]; then
    printf "Missing value for %s\n\n" "$flag"
    usage
    exit 1
  fi
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --env)
      ensure_value "$1" "${2:-}"
      ENVIRONMENT="$2"
      shift 2
      ;;
    --env=*)
      ENVIRONMENT="${1#*=}"
      shift
      ;;
    --output-dir)
      ensure_value "$1" "${2:-}"
      BACKUP_DIR="$2"
      shift 2
      ;;
    --output-dir=*)
      BACKUP_DIR="${1#*=}"
      shift
      ;;
    --retention-days)
      ensure_value "$1" "${2:-}"
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --retention-days=*)
      RETENTION_DAYS="${1#*=}"
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      printf "Unknown argument: %s\n\n" "$1"
      usage
      exit 1
      ;;
  esac
done

case "$ENVIRONMENT" in
  dev|prod) ;;
  *)
    printf "Invalid --env value: %s (expected dev|prod)\n" "$ENVIRONMENT"
    exit 1
    ;;
esac

if [ -n "$RETENTION_DAYS" ]; then
  case "$RETENTION_DAYS" in
    ''|*[!0-9]*)
      printf "Invalid --retention-days value: %s (expected integer >= 1)\n" "$RETENTION_DAYS"
      exit 1
      ;;
    0)
      printf "Invalid --retention-days value: 0 (expected integer >= 1)\n"
      exit 1
      ;;
  esac
fi

if ! command -v docker >/dev/null 2>&1; then
  printf "Docker CLI not found in PATH\n"
  exit 1
fi

COMPOSE_FILES="-f $ROOT_DIR/docker-compose.yml -f $ROOT_DIR/docker-compose.$ENVIRONMENT.yml"
POSTGRES_DB="${POSTGRES_DB:-tasktracking}"
POSTGRES_USER="${POSTGRES_USER:-tasktracking}"

STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/postgres_${ENVIRONMENT}_${STAMP}.dump"
TMP_FILE="$FILE.tmp"

cleanup() {
  if [ -f "$TMP_FILE" ]; then
    rm -f "$TMP_FILE"
  fi
}
trap cleanup EXIT INT TERM

mkdir -p "$BACKUP_DIR"

if [ -f "$FILE" ]; then
  printf "Backup target already exists: %s\n" "$FILE"
  exit 1
fi

printf "Creating backup from env=%s db=%s user=%s ...\n" "$ENVIRONMENT" "$POSTGRES_DB" "$POSTGRES_USER"

docker compose $COMPOSE_FILES exec -T postgres \
  pg_dump --format=custom --no-owner --no-privileges \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$TMP_FILE"

mv "$TMP_FILE" "$FILE"
trap - EXIT INT TERM

printf "Backup created: %s\n" "$FILE"

if [ -n "$RETENTION_DAYS" ]; then
  printf "Applying retention: deleting postgres_%s_*.dump files older than %s days\n" "$ENVIRONMENT" "$RETENTION_DAYS"
  find "$BACKUP_DIR" -maxdepth 1 -type f -name "postgres_${ENVIRONMENT}_*.dump" -mtime "+$RETENTION_DAYS" -print -delete
fi
