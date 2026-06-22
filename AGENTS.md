# AGENTS.md

## Mission

Build the web surfaces for RSC Group's multi-outlet food ordering platform:

1. A public customer experience for browsing multiple outlet menus, building one
   cart, paying once, and tracking the resulting order.
2. A central admin experience for platform-wide operations, outlets, orders,
   settlement review, reporting, delivery oversight, and system health.
3. A NestJS API that owns business rules, persistence, authorization,
   integrations, asynchronous work, and real-time events.

The supplied scope, data model, and technical brief are drafts. Preserve their
business intent, but challenge unsafe or contradictory implementation details.

## Read first

Before coding, read:

1. `docs/project-context.md`
2. `docs/architecture.md`
3. `docs/domain-model.md`
4. `docs/api.md` when changing the backend.
5. `docs/deployment.md` when changing infrastructure or runtime configuration.
6. `TODO.md`
7. The nearest app/package `AGENTS.md`, if present.

## Workspace map

- `apps/web`: Next.js App Router customer site. Public discovery and
  authenticated checkout/tracking live here.
- `apps/admin`: Vite SPA for trusted central staff. It is not the outlet POS.
- `apps/api`: NestJS REST API. Domain modules own their persistence and
  application logic; database entities never become public contracts.
- `packages/contracts`: Zod schemas, enums, and API DTOs. This is the web
  contract source of truth.
- `packages/api-client`: Fetch-based client. No UI imports.
- `packages/ui`: Shared React components and design tokens. No app routing or
  business workflows.
- `docs`: Product, architecture, domain, and decision context.

## Engineering rules

- Use TypeScript strict mode. Do not introduce `any` without a documented
  boundary reason.
- Keep server state in TanStack Query. Keep ephemeral UI state local. Use
  Zustand only for cross-route client state such as the cart.
- Validate unknown network data with schemas from `@rsc/contracts`.
- Represent money in integer minor units in application contracts
  (`amountMinor`); format only at the presentation edge.
- Never import backend ORM/database entities into a frontend package.
- Never enable TypeORM `synchronize`; all schema changes require migrations.
- API routes use the `/api/v1` namespace. Breaking contracts require a new API
  version, not silent response changes.
- Development deployment is repository-based: Dokploy clones `dev` and builds
  the Compose services. Revisit registry-based immutable releases before
  production.
- Never add VPS passwords, SSH private keys, registry tokens, Dokploy API keys,
  compose IDs, or real `.env` files to the repository.
- Do not expose payment secret keys, encryption keys, or service credentials to
  browser bundles. Public variables must be intentionally prefixed.
- Treat order and payment status transitions as server-authoritative.
- Every mutation must consider idempotency, retries, authorization, loading,
  empty, error, and success states.
- Outlet isolation is a backend/database responsibility; frontend filtering is
  usability, never security.
- Prefer accessible semantic HTML and keyboard-operable controls.

## Change workflow

1. Pick a task from `TODO.md` or add a clearly scoped item.
2. Identify the owning app/package and affected contract.
3. Add or update tests with behavior changes.
4. Run `pnpm check`, `pnpm lint`, `pnpm test`, and relevant builds.
5. Update docs when a domain rule, dependency direction, or architectural
   decision changes.

## Definition of done

- Behavior is typed, tested at the appropriate level, and accessible.
- Unknown API input is validated.
- No secrets or real customer data are committed.
- Loading/error/empty states are deliberate.
- Relevant docs and `TODO.md` are current.
- Workspace checks pass.
