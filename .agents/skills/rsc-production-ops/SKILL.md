---
name: rsc-production-ops
description: Diagnose, change, or document RSC production and staging operations on Hostinger KVM, Dokploy, Docker Compose, PostgreSQL, Redis, Cloudflare, Resend, and backups. Use for deployments, failed migrations, disk pressure, health checks, DNS, secrets, backup/restore, scaling, logs, and incident response.
---

# RSC Production Operations

## Operate conservatively

1. Read `docs/deployment.md` and the deployed Compose file.
2. Establish environment, affected service, time window, and last known good deployment.
3. Gather read-only evidence before proposing cleanup or restart actions.
4. Redact credentials, tokens, customer PII, database URLs, and private keys.
5. Require explicit approval before destructive production commands.

## Diagnose in layers

Use `scripts/collect-diagnostics.sh` for a read-only host snapshot.

1. Host: disk, memory, load, filesystem, clock, timezone.
2. Docker: containers, images, volumes, build cache, logs.
3. Platform: Dokploy deployment and Compose interpolation.
4. Dependencies: PostgreSQL and Redis health.
5. Application: readiness, migrations, structured logs, provider connectivity.

## Deployment rules

- Run migrations as a one-shot service before API readiness.
- Build a shared image once when migration and API services use the same artifact.
- Require production payment and security configuration; do not use unsafe defaults.
- Preserve persistent volumes during cleanup.
- Validate health checks and environment interpolation before rollout.
- Prefer rollback to speculative live editing.

## Backup rules

- Keep encrypted backups off the VPS.
- Prevent concurrent scheduled/manual runs across replicas.
- Record completion, size, checksum, and destination.
- Test restoration on a schedule; an untested backup is not a recovery plan.

Read `references/runbook.md` before disk cleanup, database recovery, or DNS changes.
