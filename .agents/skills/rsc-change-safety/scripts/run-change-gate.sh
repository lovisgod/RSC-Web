#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

git diff --check
pnpm check
pnpm lint
pnpm test

printf '\nChanged public-surface files:\n'
git diff --name-only -- \
  packages/contracts \
  packages/api-client \
  'apps/api/src/**/dto/**' \
  'apps/api/src/**/*response*' \
  'apps/api/src/realtime/**' || true

printf '\nChanged migrations and deployment files:\n'
git diff --name-only -- \
  apps/api/src/database/migrations \
  deploy \
  .github/workflows || true
