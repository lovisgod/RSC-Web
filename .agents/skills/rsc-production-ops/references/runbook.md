# Production Runbook

## Disk pressure

1. Run `df -h`, `docker system df -v`, `docker buildx du`, and inspect `/var/lib/docker`.
2. Identify build cache, unused images, logs, or volumes separately.
3. Never prune volumes without mapping every volume to a service and backup.
4. Prefer age- and usage-bounded BuildKit cleanup.
5. Configure Docker log rotation and verify it after daemon restart.

## Failed migration

1. Capture migration service logs and the exact migration name.
2. Check database connectivity and migration history.
3. Determine whether the migration is transactional and partially applied.
4. Fix forward when production data may already have changed.
5. Run readiness and domain smoke tests after migration.

## Database recovery

1. Preserve the failed database volume.
2. Verify backup checksum and encryption key availability.
3. Restore into an isolated database first.
4. Run migrations and integrity queries.
5. Switch traffic only after application smoke tests.

## DNS and email

- Cloudflare proxied web records must resolve to the public origin, not Cloudflare-owned IPs.
- Mail MX, SPF, DKIM, and DMARC records remain DNS-only.
- Treat account changes as new verification; copy values exactly from the current provider.
