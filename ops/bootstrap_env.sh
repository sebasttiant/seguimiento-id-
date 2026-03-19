#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

copy_if_missing() {
  source_file="$1"
  target_file="$2"

  if [ -f "$target_file" ]; then
    printf "[skip] %s already exists\n" "$target_file"
    return
  fi

  cp "$source_file" "$target_file"
  printf "[ok] created %s from %s\n" "$target_file" "$source_file"
}

copy_if_missing "$ROOT_DIR/.env.dev.example" "$ROOT_DIR/.env.dev"
copy_if_missing "$ROOT_DIR/backend/.env.dev.example" "$ROOT_DIR/backend/.env.dev"

if [ ! -f "$ROOT_DIR/.env" ]; then
  cp "$ROOT_DIR/.env.dev" "$ROOT_DIR/.env"
  printf "[ok] created %s as default Compose env file\n" "$ROOT_DIR/.env"
else
  printf "[skip] %s already exists\n" "$ROOT_DIR/.env"
fi
