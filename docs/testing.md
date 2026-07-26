# Testing strategy

RSC uses several test layers because a mocked service test cannot prove that a
PostgreSQL migration, Socket.IO room, or browser route works.

## Commands

```bash
# Unit, contract, and component tests across the workspace
pnpm test

# Existing HTTP/OpenAPI API tests
pnpm test:e2e

# Real PostgreSQL, Redis, migration, lifecycle, and Socket.IO tests
pnpm test:integration

# Customer, super-admin, outlet-admin, and owner browser journeys
pnpm test:browser

# API business-logic coverage and enforced thresholds
pnpm test:coverage
```

Playwright starts the customer web app on port `3100`, central admin on `5173`,
and outlet admin on `5175`. Install its browser once on a new machine:

```bash
pnpm exec playwright install chromium
```

## Integration database safety

The integration suite only accepts a PostgreSQL database whose name ends in
`_test`. It refuses any other name before resetting the schema. By default it
derives a sibling test database from `apps/api/.env` and uses Redis database
`15`.

Use explicit isolated services when needed:

```bash
TEST_DATABASE_URL=postgresql://rsc:password@127.0.0.1:5432/rsc_test \
TEST_REDIS_URL=redis://127.0.0.1:6379/15 \
pnpm test:integration
```

Global setup creates the test database when necessary, recreates only its
`public` schema, runs every TypeORM migration, and flushes only the configured
Redis test database.

## Current protected workflows

- All migrations boot the complete Nest application.
- Payment webhook idempotency and duplicate refund prevention.
- Mixed multi-outlet delivery and customer split-order history.
- Settlement eligibility and idempotent approval.
- Authenticated Socket.IO room access and platform-admin delivery.
- Admin and outlet-admin login validation and auth persistence.
- Outlet paid-order realtime queue refresh and cleanup.
- Browser entry journeys for customer, super admin, outlet admin, and owner.

## Coverage policy

Coverage includes all API services, guards, adapters, senders, filters, and
interceptors, including files with no tests. The initial global floor records
the repository's actual baseline; `OrdersService` and `PaymentsService` have
higher file-specific floors. Thresholds should only move upward as delivery,
finance, backups, stats, and provider adapter tests are added.

CI runs quality/build, integration, and browser jobs independently. A pull
request cannot pass by running only the fast unit suite.
