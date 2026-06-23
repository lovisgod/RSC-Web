#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  printf 'Run this audit as root: sudo bash scripts/audit-vps.sh\n' >&2
  exit 1
fi

printf 'Operating system\n'
. /etc/os-release
printf '%s %s\n\n' "$NAME" "$VERSION_ID"

printf 'Memory and disk\n'
free -h
df -h /
printf '\n'

printf 'Required commands\n'
for command in curl docker ufw; do
  if command -v "$command" >/dev/null 2>&1; then
    printf 'ok: %s\n' "$command"
  else
    printf 'missing: %s\n' "$command"
  fi
done
printf '\n'

printf 'Listening deployment ports\n'
ss -lntp | awk 'NR == 1 || /:22 |:80 |:443 |:3000 /'
printf '\n'

printf 'Docker services\n'
docker service ls 2>/dev/null || printf 'Docker Swarm/Dokploy is not available yet.\n'
