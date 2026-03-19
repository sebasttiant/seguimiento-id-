#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
TARGET_UID="${HOST_UID:-$(id -u)}"
TARGET_GID="${HOST_GID:-$(id -g)}"

TARGETS="node_modules dist .vite"

printf "Repairing frontend ownership to %s:%s\n" "$TARGET_UID" "$TARGET_GID"

if command -v docker >/dev/null 2>&1; then
  docker run --rm \
    -v "$ROOT_DIR:/workspace" \
    alpine:3.20 \
    sh -c "set -eu; for path in $TARGETS; do if [ -e \"/workspace/\$path\" ]; then chown -R $TARGET_UID:$TARGET_GID \"/workspace/\$path\"; fi; done"
  printf "Ownership repaired with Docker helper container.\n"
  exit 0
fi

for path in $TARGETS; do
  if [ -e "$ROOT_DIR/$path" ]; then
    chown -R "$TARGET_UID:$TARGET_GID" "$ROOT_DIR/$path"
  fi
done

printf "Ownership repaired with local chown.\n"
