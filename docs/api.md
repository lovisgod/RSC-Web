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

## Customer registration and verification

The first authentication slice exposes:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-user`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/admins`

Frontend applications must import the request and response types (or their Zod
schemas) from `@rsc/contracts`; they must not import the API's TypeORM entity.
`@rsc/api-client` exposes `registerCustomer(input)`, `verifyUser(input)`,
`login(input)`, and `logout()` and validates outgoing input and responses at
runtime.

### Resend verification code

`POST /api/v1/auth/resend-verification-code`

| Request field | Type     | Rules                                                  |
| ------------- | -------- | ------------------------------------------------------ | ------------------------------------------ |
| `channel`     | `"phone" | "email"`                                               | Selects which channel to resend the OTP to |
| `phone`       | `string` | Required when `channel` is `phone`; same phone formats |
| `email`       | `string` | Required when `channel` is `email`; same email rules   |

This endpoint is idempotent: it returns `200 OK` with `sent: true` even if the
account does not exist or the channel is already verified, to avoid leaking
account status. A fresh OTP is generated and dispatched only when the account
exists and the channel is unverified.

Successful `200 OK` response:

```json
{
  "data": {
    "sent": true,
    "channel": "phone",
    "otpExpiresInSeconds": 600
  },
  "message": "Verification code resent",
  "status": 200
}
```

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
    "otpExpiresInSeconds": 600,
    "verificationChannels": {
      "phone": false,
      "email": false
    }
  },
  "message": "Customer registered; verification codes sent",
  "status": 201
}
```

`POST /api/v1/auth/verify-user`

| Request field | Type     | Rules                                                  |
| ------------- | -------- | ------------------------------------------------------ | ------------------------------------------------ |
| `channel`     | `"phone" | "email"`                                               | Selects which identifier and OTP store to verify |
| `phone`       | `string` | Required when `channel` is `phone`; same phone formats |
| `email`       | `string` | Required when `channel` is `email`; same email rules   |
| `code`        | `string` | Exactly six numeric digits                             |

Successful `200 OK` response:

```json
{
  "data": {
    "customerId": "2abf9577-027c-4936-83a8-e004fd56a46e",
    "status": "ACTIVE",
    "channel": "phone",
    "verifiedAt": "2026-06-23T10:00:00.000Z",
    "verificationChannels": {
      "phone": true,
      "email": false
    }
  },
  "message": "User verified successfully",
  "status": 200
}
```

`POST /api/v1/auth/login`

| Request field | Type     | Rules                                  |
| ------------- | -------- | -------------------------------------- |
| `identifier`  | `string` | Registered email or Nigerian phone     |
| `password`    | `string` | 8-128 characters; verified with bcrypt |

Successful login sets `accessToken` and `refreshToken` as HttpOnly cookies and
returns role context for routing:

```json
{
  "data": {
    "user": {
      "id": "2abf9577-027c-4936-83a8-e004fd56a46e",
      "role": "CUSTOMER"
    },
    "accessTokenExpiresInSeconds": 900,
    "refreshTokenExpiresInSeconds": 604800
  },
  "message": "Login successful",
  "status": 200
}
```

`POST /api/v1/auth/logout`

Logout reads the active auth cookies, blacklists token IDs in Redis, deletes the
server-side session, and clears both cookies.

```json
{
  "data": {
    "loggedOut": true
  },
  "message": "Logged out successfully",
  "status": 200
}
```

`POST /api/v1/auth/admins`

Requires a valid `SUPER_ADMIN` session. Creates an outlet admin assigned to
exactly one outlet.

| Request field | Type     | Rules                                |
| ------------- | -------- | ------------------------------------ |
| `name`        | `string` | Trimmed; 2-120 characters            |
| `email`       | `string` | Valid email; trimmed and lowercased  |
| `phone`       | `string` | Nigerian mobile number               |
| `password`    | `string` | 8-128 characters; stored with bcrypt |
| `outletId`    | `uuid`   | Existing outlet the admin belongs to |

```json
{
  "data": {
    "id": "b709c9f9-7d01-4d84-90d6-50b0ad470bc5",
    "name": "Outlet Manager",
    "role": "ADMIN",
    "outletId": "4273e96c-2887-49a5-a6d5-269f007f04f0"
  },
  "message": "Admin created successfully",
  "status": 201
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

Login stores a Redis-backed session and signs short-lived access tokens plus
long-lived refresh tokens with an HS256 secret of at least 256 bits. Admin
sessions expire after 30 minutes of inactivity.

Seed the first super admin after migrations:

```bash
SUPER_ADMIN_NAME="RSC Super Admin" \
SUPER_ADMIN_EMAIL="admin@example.com" \
SUPER_ADMIN_PHONE="08031234567" \
SUPER_ADMIN_PASSWORD="replace-with-a-strong-password" \
pnpm --filter @rsc/api seed:super-admin
```

Inside a built production container, run `node dist/src/auth/seed-super-admin.js`
with the same environment variables.

Termii delivery uses `POST {TERMII_BASE_URL}/api/sms/send` with an approved
sender ID. Set:

```dotenv
SMS_PROVIDER=termii
TERMII_BASE_URL=https://v3.api.termii.com
TERMII_API_KEY=replace-with-dashboard-api-key
TERMII_SENDER_ID=RSCApp
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
curl --request POST https://api-dev.rscapp.xyz/api/v1/auth/verify-user \
  --header 'content-type: application/json' \
  --data '{"channel":"phone","phone":"08031234567","code":"123456"}'
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
| `email_verified_at` | Email verification timestamp, nullable        |
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
