#!/bin/sh
set -e

python /app/scripts/wait_for_postgres.py

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  python manage.py migrate --noinput
fi

if [ "${SEED_DEMO_USERS:-0}" = "1" ] && [ "${1:-}" = "gunicorn" ]; then
  python manage.py seed_demo_users
fi

if [ "${COLLECTSTATIC:-1}" = "1" ]; then
  python manage.py collectstatic --noinput
fi

exec "$@"
