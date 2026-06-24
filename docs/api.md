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

Frontend applications must import the request and response types (or their Zod
schemas) from `@rsc/contracts`; they must not import the API's TypeORM entity.
`@rsc/api-client` exposes `registerCustomer(input)` and `verifyPhone(input)` and
validates both outgoing input and incoming responses at runtime.

### Registration contract

`POST /api/v1/auth/register`

| Request field | Type     | Rules                                               |
| ------------- | -------- | --------------------------------------------------- |
| `name`        | `string` | Trimmed; 2–120 characters                           |
| `phone`       | `string` | Nigerian mobile: `080…`, `23480…`, or `+23480…`     |
| `email`       | `string` | Valid email; trimmed, lowercased; maximum 254 chars |

Successful `201 Created` response:

```json
{
  "data": {
    "customerId": "2abf9577-027c-4936-83a8-e004fd56a46e",
    "status": "UNVERIFIED",
    "otpExpiresInSeconds": 600
  },
  "message": "Customer registered; verification code sent",
  "status": 201
}
```

`POST /api/v1/auth/verify-phone`

| Request field | Type     | Rules                                        |
| ------------- | -------- | -------------------------------------------- |
| `phone`       | `string` | Same Nigerian mobile formats as registration |
| `code`        | `string` | Exactly six numeric digits                   |

Successful `200 OK` response:

```json
{
  "data": {
    "customerId": "2abf9577-027c-4936-83a8-e004fd56a46e",
    "status": "ACTIVE",
    "phoneVerifiedAt": "2026-06-23T10:00:00.000Z"
  },
  "message": "Phone verified successfully",
  "status": 200
}
```

All API controller responses use the same top-level envelope:

- `data` — the endpoint payload, or structured error details.
- `message` — a human-readable result message.
- `status` — the numeric HTTP status code.

Errors retain the same envelope and put `errors`, `path`, `requestId`, and
`timestamp` inside `data`. The shared API client validates the envelope and
returns its typed `data` payload to application code.

The machine-readable sources of truth are:

- `packages/contracts/src/index.ts` — shared Zod schemas and inferred
  TypeScript types.
- `packages/api-client/src/index.ts` — ready-to-use typed frontend calls.
- `/api/docs` and `/api/openapi.json` — interactive Swagger and OpenAPI when
  `SWAGGER_ENABLED=true`.

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

After configuring Termii, register with a Nigerian number you can receive SMS
on:

```bash
curl --request POST https://api-dev.rscapp.xyz/api/v1/auth/register \
  --header 'content-type: application/json' \
  --data '{"name":"Ada Okafor","phone":"08031234567","email":"ada@example.com"}'
```

The response must be `201 Created`, with `status` set to `UNVERIFIED` and
`otpExpiresInSeconds` set to `600`. Enter the code received by SMS:

```bash
curl --request POST https://api-dev.rscapp.xyz/api/v1/auth/verify-phone \
  --header 'content-type: application/json' \
  --data '{"phone":"08031234567","code":"123456"}'
```

The verification response must be `200 OK` with `status` set to `ACTIVE`.
Replace the example identity and OTP before running these commands. Never place
the Termii API key in either request; it remains a server-only environment
variable.

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

Customer registration is persisted in the `users` table. It is created by
`apps/api/src/database/migrations/1782172800000-create-customers.ts`, renamed
for existing deployments by
`apps/api/src/database/migrations/1782429300000-rename-customers-to-users.ts`, and mapped
inside the API by `apps/api/src/auth/customer.entity.ts`. The public fields do
not map one-to-one to columns: phone and email are encrypted before storage and
have separate deterministic hash columns for lookup and uniqueness.

| Database column     | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `id`                | UUID primary key                              |
| `name`              | Customer display name                         |
| `phone_encrypted`   | Encrypted normalized phone number             |
| `phone_hash`        | Unique lookup hash; never returned to clients |
| `email_encrypted`   | Encrypted normalized email address            |
| `email_hash`        | Unique lookup hash; never returned to clients |
| `status`            | `UNVERIFIED`, `ACTIVE`, or `SUSPENDED`        |
| `phone_verified_at` | Verification timestamp, nullable              |
| `created_at`        | Creation timestamp                            |
| `updated_at`        | Last update timestamp                         |

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
