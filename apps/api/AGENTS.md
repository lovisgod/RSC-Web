# API agent guide

## Boundaries

- Controllers translate HTTP concerns and call application services.
- Services own use cases and transaction boundaries.
- Entities and repositories stay inside the owning domain module.
- `@rsc/contracts` contains transport contracts shared with clients. Do not
  export TypeORM entities from this app.
- Integrations sit behind interfaces/adapters so provider changes do not rewrite
  domain workflows.

## Data and money

- Use PostgreSQL migrations only. `synchronize` must remain `false`.
- Store money as `numeric` in PostgreSQL and convert explicitly at the boundary.
  Shared API contracts use integer minor units.
- Historical order lines and financial ledger entries are immutable snapshots.
- Multi-step order/payment/settlement changes require database transactions and
  idempotency keys.

## Security and operations

- Validate every environment at startup and every request at the HTTP boundary.
- Avoid logging credentials, tokens, raw provider payloads, or customer PII.
- `/api/v1/health/live` proves the process is alive.
- `/api/v1/health/ready` proves PostgreSQL and Redis are reachable.
- Keep Swagger enabled outside production by default; explicitly opt in for
  production documentation.
