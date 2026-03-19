#!/usr/bin/env sh
set -eu

BASE_URL="${BASE_URL:-http://localhost:8080}"
LOGIN_IDENTIFIER="${LOGIN_IDENTIFIER:-admin}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-Admin123!}"

usage() {
  cat <<'EOF'
Usage:
  ./ops/smoke_e2e.sh [--base-url <url>] [--identifier <user-or-email>] [--password <password>]

Defaults:
  --base-url  http://localhost:8080
  --identifier admin
  --password  Admin123!
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
    --base-url)
      ensure_value "$1" "${2:-}"
      BASE_URL="$2"
      shift 2
      ;;
    --base-url=*)
      BASE_URL="${1#*=}"
      shift
      ;;
    --identifier)
      ensure_value "$1" "${2:-}"
      LOGIN_IDENTIFIER="$2"
      shift 2
      ;;
    --identifier=*)
      LOGIN_IDENTIFIER="${1#*=}"
      shift
      ;;
    --email)
      ensure_value "$1" "${2:-}"
      LOGIN_IDENTIFIER="$2"
      shift 2
      ;;
    --email=*)
      LOGIN_IDENTIFIER="${1#*=}"
      shift
      ;;
    --password)
      ensure_value "$1" "${2:-}"
      LOGIN_PASSWORD="$2"
      shift 2
      ;;
    --password=*)
      LOGIN_PASSWORD="${1#*=}"
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

if ! command -v python3 >/dev/null 2>&1; then
  printf "python3 is required for JSON parsing in smoke test\n"
  exit 1
fi

printf "[1/4] Checking reverse-proxy health: %s/healthz\n" "$BASE_URL"
curl -fsS "$BASE_URL/healthz" >/dev/null

printf "[2/4] Checking API health: %s/api/health\n" "$BASE_URL"
curl -fsS "$BASE_URL/api/health" >/dev/null

printf "[3/4] Logging in demo user: %s\n" "$LOGIN_IDENTIFIER"
LOGIN_PAYLOAD=$(printf '{"identifier":"%s","password":"%s"}' "$LOGIN_IDENTIFIER" "$LOGIN_PASSWORD")
LOGIN_RESPONSE=$(curl -fsS -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d "$LOGIN_PAYLOAD")

ACCESS_TOKEN=$(printf '%s' "$LOGIN_RESPONSE" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access", ""))')
if [ -z "$ACCESS_TOKEN" ]; then
  printf "Login succeeded but access token is missing. Raw response: %s\n" "$LOGIN_RESPONSE"
  exit 1
fi

printf "[4/4] Validating protected endpoint: %s/api/auth/me\n" "$BASE_URL"
curl -fsS "$BASE_URL/api/auth/me" -H "Authorization: Bearer $ACCESS_TOKEN" >/dev/null

printf "Smoke E2E passed for %s\n" "$BASE_URL"
