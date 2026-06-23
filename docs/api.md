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
