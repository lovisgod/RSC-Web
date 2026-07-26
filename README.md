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

API runs at `http://localhost:4000`. The frontends use separate local hostnames
to isolate their HttpOnly authentication cookies:

- customer web: `http://web.localhost:3000`
- central admin: `http://admin.localhost:5173`
- outlet admin: `http://outlet.localhost:5175`

Deployed development URLs are `https://dev.rscapp.xyz`,
`https://admin-dev.rscapp.xyz`, and `https://api-dev.rscapp.xyz`.

## Before pushing

`pnpm install` configures the tracked pre-push hook. Every push runs formatting,
linting, type checks, unit/contract tests, API e2e tests (including Swagger and
OpenAPI smoke tests), and all production builds. Run the same gate manually:

```bash
pnpm prepush
```

Read [AGENTS.md](./AGENTS.md) before making changes. Product and architecture
context lives in [`docs/`](./docs/).

Deployment through Dokploy's native GitHub provider is documented in
[`docs/deployment.md`](./docs/deployment.md).

The unit, integration, realtime, browser, and coverage test layers are documented
in [`docs/testing.md`](./docs/testing.md).
