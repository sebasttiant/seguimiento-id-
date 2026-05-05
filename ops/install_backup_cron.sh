#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SCHEDULE="30 2 * * *"
ENVIRONMENT="prod"
RETENTION_DAYS="30"
OUTPUT_DIR="$ROOT_DIR/ops/backups"
LOG_FILE="$ROOT_DIR/ops/backups/backup_cron.log"
DRY_RUN="0"
MARKER_BEGIN="# seguimiento-id postgres backup BEGIN"
MARKER_END="# seguimiento-id postgres backup END"

usage() {
  cat <<'EOF'
Usage:
  ./ops/install_backup_cron.sh [options]

Installs or replaces a user crontab entry for ops/backup_postgres.sh.
No secrets are stored by this helper.

Options:
  --schedule <cron>        Cron schedule (default: "30 2 * * *")
  --env dev|prod           Backup target compose profile (default: prod)
  --retention-days <N>     Retention days passed to backup script (default: 30)
  --output-dir <path>      Backup output directory (default: ./ops/backups)
  --log-file <path>        Cron log file (default: ./ops/backups/backup_cron.log)
  --dry-run                Print resulting crontab without installing
  --help                   Show this help
EOF
}

ensure_value() {
  flag="$1"
  value="$2"
  if [ -z "$value" ] || [ "${value#--}" != "$value" ]; then
    printf 'Missing value for %s\n\n' "$flag" >&2
    usage
    exit 1
  fi
}

reject_unsafe_path() {
  label="$1"
  value="$2"
  case "$value" in
    *\"*|*\`*|*\$*)
      printf 'Unsupported character in %s: %s\n' "$label" "$value" >&2
      exit 1
      ;;
  esac
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --schedule)
      ensure_value "$1" "${2:-}"
      SCHEDULE="$2"
      shift 2
      ;;
    --env)
      ensure_value "$1" "${2:-}"
      ENVIRONMENT="$2"
      shift 2
      ;;
    --retention-days)
      ensure_value "$1" "${2:-}"
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --output-dir)
      ensure_value "$1" "${2:-}"
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --log-file)
      ensure_value "$1" "${2:-}"
      LOG_FILE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="1"
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n\n' "$1" >&2
      usage
      exit 1
      ;;
  esac
done

case "$ENVIRONMENT" in
  dev|prod) ;;
  *)
    printf 'Invalid --env value: %s (expected dev|prod)\n' "$ENVIRONMENT" >&2
    exit 1
    ;;
esac

case "$RETENTION_DAYS" in
  ''|*[!0-9]*|0)
    printf 'Invalid --retention-days value: %s (expected integer >= 1)\n' "$RETENTION_DAYS" >&2
    exit 1
    ;;
esac

reject_unsafe_path "output dir" "$OUTPUT_DIR"
reject_unsafe_path "log file" "$LOG_FILE"

mkdir -p "$(dirname -- "$LOG_FILE")"

CRON_COMMAND="\"$ROOT_DIR/ops/backup_postgres.sh\" --env \"$ENVIRONMENT\" --output-dir \"$OUTPUT_DIR\" --retention-days \"$RETENTION_DAYS\" >> \"$LOG_FILE\" 2>&1"
CRON_BLOCK="$MARKER_BEGIN
$SCHEDULE $CRON_COMMAND
$MARKER_END"

CURRENT_CRON="$(crontab -l 2>/dev/null || true)"
FILTERED_CRON="$(printf '%s\n' "$CURRENT_CRON" | awk -v begin="$MARKER_BEGIN" -v end="$MARKER_END" '
  $0 == begin {skip=1; next}
  $0 == end {skip=0; next}
  skip != 1 {print}
')"

if [ -n "$FILTERED_CRON" ]; then
  NEW_CRON="$FILTERED_CRON
$CRON_BLOCK"
else
  NEW_CRON="$CRON_BLOCK"
fi

if [ "$DRY_RUN" = "1" ]; then
  printf '%s\n' "$NEW_CRON"
  exit 0
fi

printf '%s\n' "$NEW_CRON" | crontab -
printf 'Installed postgres backup cron for env=%s schedule=%s\n' "$ENVIRONMENT" "$SCHEDULE"
