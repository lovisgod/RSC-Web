# RSC Web Platform

Turborepo workspace for the RSC multi-outlet food ordering platform.

## Applications

- `apps/web` — customer-facing Next.js application.
- `apps/admin` — central operations dashboard built with React and Vite.

## Shared packages

- `@rsc/contracts` — transport-safe domain contracts and validation schemas.
- `@rsc/api-client` — typed HTTP client used by both applications.
- `@rsc/ui` — framework-neutral React UI primitives and design tokens.
- `@rsc/typescript-config` — shared strict TypeScript configuration.

## Start locally

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
pnpm dev
```

Customer web runs at `http://localhost:3000`; central admin runs at
`http://localhost:5173`.

Read [AGENTS.md](./AGENTS.md) before making changes. Product and architecture
context lives in [`docs/`](./docs/).
