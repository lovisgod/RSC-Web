#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
API_DIR="$REPO_DIR/apps/api"

DB_NAME="$(
  cd "$API_DIR"
  node -e 'require("dotenv").config({ quiet: true }); const databaseUrl = process.env.DATABASE_URL; if (!databaseUrl) throw new Error("DATABASE_URL is required"); console.log(new URL(databaseUrl).pathname.replace(/^\//, ""));'
)"

printf 'Resetting API database: %s\n' "$DB_NAME"

cd "$API_DIR"
pnpm exec typeorm-ts-node-commonjs schema:drop -d src/database/data-source.ts
pnpm run migration:run
