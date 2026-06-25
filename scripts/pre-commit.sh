#!/bin/sh
set -eu

STAGED=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|js|jsx|json|css|md|yaml|yml)$' || true)

if [ -n "$STAGED" ]; then
  echo "$STAGED" | xargs node_modules/.bin/prettier --write --log-level warn
  echo "$STAGED" | xargs git add
fi
