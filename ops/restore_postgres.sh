#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENVIRONMENT="dev"
CONFIRM="0"

usage() {
  cat <<'EOF'
Usage:
  ./ops/restore_postgres.sh <backup-file.(sql|dump)> [--env dev|prod] [--yes]

Options:
  --env   Target compose profile (default: dev)
  --yes   Skip interactive confirmation
  --help  Show this help
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

if [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

if [ "$#" -lt 1 ]; then
  usage
  exit 1
fi

BACKUP_FILE="$1"
shift

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
    --yes)
      CONFIRM="1"
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

if [ ! -f "$BACKUP_FILE" ]; then
  printf "Backup file not found: %s\n" "$BACKUP_FILE"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  printf "Docker CLI not found in PATH\n"
  exit 1
fi

COMPOSE_FILES="-f $ROOT_DIR/docker-compose.yml -f $ROOT_DIR/docker-compose.$ENVIRONMENT.yml"
POSTGRES_DB="${POSTGRES_DB:-tasktracking}"
POSTGRES_USER="${POSTGRES_USER:-tasktracking}"

if [ "$CONFIRM" != "1" ]; then
  printf "You are about to restore '%s' into env=%s db=%s user=%s\n" "$BACKUP_FILE" "$ENVIRONMENT" "$POSTGRES_DB" "$POSTGRES_USER"
  printf "This operation is destructive for current database data. Continue? [y/N]: "
  read -r answer
  case "$answer" in
    y|Y|yes|YES) ;;
    *)
      printf "Restore aborted by user\n"
      exit 1
      ;;
  esac
fi

printf "Restoring backup into env=%s db=%s ...\n" "$ENVIRONMENT" "$POSTGRES_DB"

case "$BACKUP_FILE" in
  *.dump)
    docker compose $COMPOSE_FILES exec -T postgres \
      pg_restore --clean --if-exists --no-owner --no-privileges \
      -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$BACKUP_FILE"
    ;;
  *.sql)
    docker compose $COMPOSE_FILES exec -T postgres \
      psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$BACKUP_FILE"
    ;;
  *)
    printf "Unsupported backup extension for: %s\n" "$BACKUP_FILE"
    printf "Supported formats: .dump (pg_dump -Fc) and .sql\n"
    exit 1
    ;;
esac

printf "Restore completed from: %s\n" "$BACKUP_FILE"
