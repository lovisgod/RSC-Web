#!/bin/sh
set -eu

next_env="apps/web/next-env.d.ts"
next_env_backup="$(mktemp)"
cp "$next_env" "$next_env_backup"
trap 'cp "$next_env_backup" "$next_env"; rm -f "$next_env_backup"' EXIT HUP INT TERM

run() {
  printf '\n==> %s\n' "$1"
  shift
  "$@"
}

run "Formatting" pnpm format:check
run "Lint" pnpm lint
run "Type checking" pnpm check
run "Unit and contract tests" pnpm test
run "API end-to-end tests" pnpm test:e2e
run "Production builds" pnpm build

printf '\nAll pre-push checks passed.\n'
