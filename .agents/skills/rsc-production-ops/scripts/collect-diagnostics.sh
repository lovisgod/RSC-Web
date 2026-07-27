#!/usr/bin/env bash
set -u

printf '%s\n' '== clock =='
date
timedatectl 2>/dev/null || true

printf '%s\n' '== host =='
uptime
df -h
free -h 2>/dev/null || vm_stat 2>/dev/null || true

printf '%s\n' '== docker containers =='
docker ps -a --format 'table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Image}}' 2>/dev/null || true

printf '%s\n' '== docker usage =='
docker system df -v 2>/dev/null || true
docker buildx du 2>/dev/null || true

printf '%s\n' '== largest docker directories =='
if [ -d /var/lib/docker ]; then
  sudo du -xh --max-depth=1 /var/lib/docker 2>/dev/null | sort -h || true
fi
