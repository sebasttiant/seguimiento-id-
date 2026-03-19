#!/usr/bin/env sh
set -eu

ENVIRONMENT="dev"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --env=*)
      ENVIRONMENT="${1#*=}"
      shift
      ;;
    *)
      printf "Unknown argument: %s\n" "$1"
      exit 1
      ;;
  esac
done

case "$ENVIRONMENT" in
  dev)
    NGINX_PORT="${NGINX_PORT:-8080}"
    FRONTEND_PORT="${FRONTEND_PORT:-5173}"
    URLS="http://localhost:${NGINX_PORT}/healthz http://localhost:${NGINX_PORT}/api/health http://localhost:${FRONTEND_PORT}"
    ;;
  prod)
    NGINX_PORT="${NGINX_PORT:-80}"
    URLS="http://localhost:${NGINX_PORT}/healthz http://localhost:${NGINX_PORT}/api/health"
    ;;
  *)
    printf "Invalid --env value: %s (expected dev|prod)\n" "$ENVIRONMENT"
    exit 1
    ;;
esac

for url in $URLS; do
  printf "Checking %s ... " "$url"
  curl -fsS "$url" >/dev/null
  printf "OK\n"
done

printf "Health checks passed for env=%s\n" "$ENVIRONMENT"
