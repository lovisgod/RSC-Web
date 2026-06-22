# RSC Web Platform

Turborepo workspace for the RSC multi-outlet food ordering platform.

## Applications

- `apps/web` — customer-facing Next.js application.
- `apps/admin` — central operations dashboard built with React and Vite.
- `apps/api` — NestJS API backed by PostgreSQL/PostGIS and Redis.

## Shared packages

- `@rsc/contracts` — transport-safe domain contracts and validation schemas.
- `@rsc/api-client` — typed HTTP client used by both applications.
- `@rsc/ui` — framework-neutral React UI primitives and design tokens.
- `@rsc/typescript-config` — shared strict TypeScript configuration.

## Start locally

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
pnpm infra:up
pnpm --filter @rsc/api migration:run
pnpm dev
```

API runs at `http://localhost:4000`, customer web at `http://localhost:3000`,
and central admin at `http://localhost:5173`.

Read [AGENTS.md](./AGENTS.md) before making changes. Product and architecture
context lives in [`docs/`](./docs/).

Deployment through GitHub Actions and Dokploy is documented in
[`docs/deployment.md`](./docs/deployment.md).
