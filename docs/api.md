# API foundation

The API lives in `apps/api` and uses NestJS 11, PostgreSQL 16 with PostGIS,
Redis, and TypeORM migrations.

## Local startup

```bash
cp apps/api/.env.example apps/api/.env
pnpm infra:up
pnpm --filter @rsc/api migration:run
pnpm dev:api
```

Endpoints:

- `GET http://localhost:4000/api/v1`
- `GET http://localhost:4000/api/v1/health/live`
- `GET http://localhost:4000/api/v1/health/ready`
- Swagger UI: `http://localhost:4000/api/docs`
- OpenAPI JSON: `http://localhost:4000/api/openapi.json`

## Customer registration and phone verification

The first authentication slice exposes:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-phone`

Registration accepts a name, Nigerian mobile number, and email address. Phone
numbers are normalized to `234...` international format. Phone and email values
are encrypted at rest with AES-256-GCM; deterministic, peppered SHA-256 hashes
are stored separately for indexed lookup and uniqueness.

The API generates a cryptographically secure six-digit OTP, stores only its
HMAC-SHA-256 digest in Redis, limits it to five attempts, and expires it after
ten minutes. Successful verification consumes the OTP and changes the customer
from `UNVERIFIED` to `ACTIVE`.

Termii delivery uses `POST {TERMII_BASE_URL}/api/sms/send` with an approved
sender ID. Set:

```dotenv
SMS_PROVIDER=termii
TERMII_BASE_URL=https://api.ng.termii.com
TERMII_API_KEY=replace-with-dashboard-api-key
TERMII_SENDER_ID=RSC
TERMII_CHANNEL=dnd
```

The exact regional base URL comes from the Termii dashboard. `dnd` is the
recommended transactional route for Nigerian recipients when the sender ID is
approved for that route.

Generate the security values once per environment:

```bash
openssl rand -base64 32 # PII_ENCRYPTION_KEY
openssl rand -hex 32    # PII_HASH_PEPPER
openssl rand -hex 32    # OTP_PEPPER
```

Changing `PII_ENCRYPTION_KEY` after customer data exists makes existing
encrypted values unreadable. Keep it in the environment's secret store and
back it up securely. Never reuse development values in staging or production.

## Database policy

- `synchronize` is always disabled.
- Migrations are committed and run explicitly.
- The first migration enables `pgcrypto` and `postgis`.
- Each domain module will own its entities, repositories, and migrations.
- API DTOs/contracts must not expose entities.

Create a blank migration:

```bash
pnpm --filter @rsc/api migration:create src/database/migrations/add-outlets
```

Generate from entity changes:

```bash
pnpm --filter @rsc/api migration:generate src/database/migrations/add-outlets
```

Run or revert:

```bash
pnpm --filter @rsc/api migration:run
pnpm --filter @rsc/api migration:revert
```

## Health semantics

- Liveness does not depend on external services.
- Readiness requires PostgreSQL and Redis.
- Container orchestration should restart failed processes based on liveness and
  stop routing traffic when readiness fails.

## Next vertical slice

Implement `outlets` and public catalog end to end:

1. Outlet entity and migration.
2. Repository and application service.
3. Public list/detail endpoints.
4. Shared Zod contracts.
5. API-client methods.
6. Customer web integration.
