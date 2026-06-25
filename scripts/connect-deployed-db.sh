#!/usr/bin/env bash
set -euo pipefail

HOST="${RSC_DB_SSH_HOST:-72.61.202.26}"
USER="${RSC_DB_SSH_USER:-root}"
LOCAL_PORT="${RSC_DB_LOCAL_PORT:-15432}"
LOCAL_BIND="${RSC_DB_LOCAL_BIND:-127.0.0.1}"
PROJECT="${RSC_DB_COMPOSE_PROJECT:-}"
SERVICE="${RSC_DB_COMPOSE_SERVICE:-postgres}"
ENV_HINT="${RSC_DB_ENV_HINT:-development}"
REMOTE_PORT="${RSC_DB_REMOTE_PORT:-5432}"

usage() {
  cat <<'USAGE'
Open a secure local tunnel to the deployed RSC Postgres container.

Usage:
  scripts/connect-deployed-db.sh [--host HOST] [--user USER] [--local-port PORT]

Environment overrides:
  RSC_DB_SSH_HOST           default: 72.61.202.26
  RSC_DB_SSH_USER           default: root
  RSC_DB_LOCAL_PORT         default: 15432
  RSC_DB_COMPOSE_PROJECT    optional exact Docker Compose project name
  RSC_DB_COMPOSE_SERVICE    default: postgres
  RSC_DB_ENV_HINT           default: development

Beekeeper connection while this is running:
  Type: PostgreSQL
  Host: 127.0.0.1
  Port: 15432
  Database: rsc
  User: rsc
  Password: POSTGRES_PASSWORD from Dokploy
  SSL: off
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      HOST="${2:?--host requires a value}"
      shift 2
      ;;
    --user)
      USER="${2:?--user requires a value}"
      shift 2
      ;;
    --local-port)
      LOCAL_PORT="${2:?--local-port requires a value}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

TARGET="${USER}@${HOST}"

if [[ -n "$PROJECT" ]]; then
  printf 'Discovering %s/%s on %s...\n' "$PROJECT" "$SERVICE" "$TARGET" >&2
  PROJECT_ARG="$PROJECT"
else
  printf 'Discovering %s service matching "%s" on %s...\n' "$SERVICE" "$ENV_HINT" "$TARGET" >&2
  PROJECT_ARG="__auto__"
fi

REMOTE_HOST="$(
  ssh "$TARGET" 'sh -s' -- "$PROJECT_ARG" "$SERVICE" "$ENV_HINT" <<'REMOTE'
set -eu

project="$1"
service="$2"
env_hint="$3"

if [ "$project" = "__auto__" ]; then
  project=""
fi

if ! docker info >/dev/null 2>&1; then
  cat >&2 <<'ERROR'
The SSH user can connect, but cannot access Docker on the VPS.

Fix option A, recommended:
  ssh into the VPS and run:
    sudo usermod -aG docker "$USER"

  Then fully log out of SSH and reconnect before running this script again.

Fix option B:
  Run this script with an SSH user that already has Docker access, such as root.
ERROR
  exit 13
fi

if [ -n "$project" ]; then
  container_id="$(
    docker ps \
      --filter "label=com.docker.compose.project=${project}" \
      --filter "label=com.docker.compose.service=${service}" \
      --format '{{.ID}}' \
      | head -n 1
  )"
else
  container_id="$(
    docker ps \
      --filter "label=com.docker.compose.service=${service}" \
      --format '{{.Names}} {{.ID}}' \
      | awk -v hint="$env_hint" '
          index(tolower($1), tolower(hint)) && index(tolower($1), "staging") == 0 { print $2; found = 1; exit }
          !first { first = $2 }
          END { if (!found && first) print first }
        '
  )"
fi

if [ -z "$container_id" ] && [ -n "$project" ]; then
  container_id="$(
    docker ps \
      --filter "name=${project}.*${service}" \
      --format '{{.ID}}' \
      | head -n 1
  )"
fi

if [ -z "$container_id" ]; then
  printf 'Could not find a running Docker container for service "%s".\n' "$service" >&2
  printf 'Running matching candidates:\n' >&2
  docker ps --filter "label=com.docker.compose.service=${service}" --format '  {{.Names}}  {{.ID}}' >&2
  exit 1
fi

docker inspect \
  --format '{{range .NetworkSettings.Networks}}{{if .IPAddress}}{{.IPAddress}}{{println}}{{end}}{{end}}' \
  "$container_id" \
  | head -n 1
REMOTE
)"

if [[ -z "$REMOTE_HOST" ]]; then
  printf 'Could not determine the deployed Postgres container IP.\n' >&2
  exit 1
fi

cat >&2 <<INFO

Tunnel ready:
  local:  ${LOCAL_BIND}:${LOCAL_PORT}
  remote: ${REMOTE_HOST}:${REMOTE_PORT}

Leave this terminal open while using Beekeeper Studio.

INFO

exec ssh -N -L "${LOCAL_BIND}:${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}" "$TARGET"
