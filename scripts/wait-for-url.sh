#!/usr/bin/env bash
set -euo pipefail

url="${1:?usage: wait-for-url.sh <url> [expected-version] [attempts]}"
expected_version="${2:-}"
attempts="${3:-30}"

for ((attempt = 1; attempt <= attempts; attempt += 1)); do
  response="$(curl --silent --show-error --location --max-time 10 "$url" 2>/dev/null || true)"

  if [[ -n "$response" ]]; then
    if [[ -z "$expected_version" || "$response" == *"$expected_version"* ]]; then
      printf 'Health check passed: %s\n' "$url"
      exit 0
    fi
  fi

  printf 'Waiting for %s (%d/%d)\n' "$url" "$attempt" "$attempts"
  sleep 10
done

printf 'Health check failed: %s\n' "$url" >&2
exit 1
