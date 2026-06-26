#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
API_DIR="$REPO_DIR/apps/api"
SEED_MODE="${RESET_API_DB_SEED:-}"

for arg in "$@"; do
  case "$arg" in
    --seed|--seed-all)
      SEED_MODE="all"
      ;;
    --seed-super-admin)
      SEED_MODE="super-admin"
      ;;
    --seed-demo)
      SEED_MODE="demo"
      ;;
    --no-seed)
      SEED_MODE="none"
      ;;
    *)
      printf 'Unknown option: %s\n' "$arg" >&2
      printf 'Usage: %s [--seed|--seed-super-admin|--seed-demo|--no-seed]\n' "$0" >&2
      exit 2
      ;;
  esac
done

DB_NAME="$(
  cd "$API_DIR"
  node -e 'require("dotenv").config({ quiet: true }); const databaseUrl = process.env.DATABASE_URL; if (!databaseUrl) throw new Error("DATABASE_URL is required"); console.log(new URL(databaseUrl).pathname.replace(/^\//, ""));'
)"

printf 'Resetting API database: %s\n' "$DB_NAME"

cd "$API_DIR"
pnpm exec typeorm-ts-node-commonjs schema:drop -d src/database/data-source.ts
pnpm run migration:run

if [ -z "$SEED_MODE" ] && [ -t 0 ]; then
  printf 'Seed database after reset? [y/N] '
  read -r answer
  case "$answer" in
    y|Y|yes|YES)
      SEED_MODE="all"
      ;;
    *)
      SEED_MODE="none"
      ;;
  esac
fi

case "${SEED_MODE:-none}" in
  all|true|1|yes)
    pnpm run seed:super-admin
    pnpm run seed:demo
    ;;
  super-admin)
    pnpm run seed:super-admin
    ;;
  demo)
    pnpm run seed:demo
    ;;
  none|false|0|no)
    printf 'Skipping seeds.\n'
    ;;
  *)
    printf 'Invalid RESET_API_DB_SEED value: %s\n' "$SEED_MODE" >&2
    printf 'Use one of: all, super-admin, demo, none.\n' >&2
    exit 2
    ;;
esac
