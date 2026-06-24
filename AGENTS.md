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

## Session context (2026-06-24)

### Local dev environment
- **OS:** macOS (no Homebrew, no Docker for dev — user prefers native services)
- **PostgreSQL:** running natively on port 5432, credentials in `apps/api/.env`
- **Redis:** installed from source (`/tmp/redis-7.4.2`) to `~/.local/bin`, started as daemon (`redis-server --daemonize yes --appendonly yes --logfile /tmp/redis.log`)
- **API:** NestJS 11 on port 4000, started via `pnpm --filter @rsc/api dev`
- **Package manager:** pnpm (workspaces monorepo)
- **Commands:**
  - `pnpm dev:api` — start API in watch mode
  - `pnpm --filter @rsc/api test` — run unit tests
  - `pnpm --filter @rsc/api test:e2e` — run e2e tests
  - `pnpm --filter @rsc/api check` — typecheck
  - `redis-server --daemonize yes` — start Redis
  - `redis-cli ping` — verify Redis

### Auth module (apps/api/src/auth/)
- **POST /api/v1/auth/register** flow:
  1. DTO validated (class-validator with `@Matches` for phone, `@IsEmail`, `@Length(8,128)` for password)
  2. Phone normalized to `234…` format via `normalizeNigerianPhoneNumber()`
  3. Email trimmed + lowercased
  4. Password hashed using Node.js `crypto.scryptSync` with random 16-byte salt (stored as `salt:derivedKey`)
  5. PII encrypted via `PiiCryptoService` (AES-256-GCM), hashed for lookup (SHA-256 with pepper)
  6. Existing customer check (phone and email hash lookups)
  7. Customer saved to PostgreSQL (encrypted PII, password hash, status `UNVERIFIED`)
  8. 6-digit OTP generated and stored in Redis (HMAC-SHA-256 digest, 5 attempts, 10 min TTL)
  9. SMS sent via `SmsSender` interface (NoopSmsSender when `SMS_PROVIDER=noop`)
- **POST /api/v1/auth/verify-phone** flow:
  1. Phone normalized, customer looked up by hash
  2. OTP verified against Redis via Lua script (atomically checks hash, decrements attempts)
  3. On success: status → `ACTIVE`, `phoneVerifiedAt` set, customer saved
- **Password:** scrypt with salt, stored as hash in `password_hash` column (char(128)), no login endpoint yet

### Key errors and fixes
- **500 on register** = Redis not running. The `phoneOtp.store()` call throws a plain `Error` (not `HttpException`) when Redis is unreachable. The `ApiExceptionFilter` catches it and returns 500 "Internal server error". **Fix:** start Redis.

### Architecture notes
- NestJS global pipes: `ValidationPipe` with `transform: true, whitelist: true, forbidNonWhitelisted: true`
- Global interceptor: `ApiResponseInterceptor` wraps all responses in `{ data, message, status }` envelope
- Global filter: `ApiExceptionFilter` — catches all, formats non-HttpException as 500 with `["Internal server error"]`
- Request ID middleware adds `x-request-id` header
- `@rsc/contracts` is source of truth for shared Zod schemas/DTOs
- `@rsc/api-client` provides typed fetch functions that validate at runtime
- Security: `PiiCryptoService` in `SecurityModule` (global) for encrypting PII
- Database: TypeORM with `synchronize: false`, migrations in `apps/api/src/database/migrations/`
- Redis: `RedisModule` provides `REDIS_CLIENT` token for ioredis, with `lazyConnect: true`
- Config: Joi-validated env vars in `environment.ts`, typed config in `configuration.ts`
- Health: `/api/v1/health/live` (process only), `/api/v1/health/ready` (PostgreSQL + Redis)

### Backlog priority
Next unchecked P1 task: **Implement the first domain vertical slice: outlets and public catalog** (see TODO.md)
