---
name: rsc-nest-typeorm
description: Implement, debug, or review NestJS and TypeORM code in the RSC API. Use for modules, dependency injection, repositories, entities, migrations, transactions, row locking, query builders, status transitions, schedulers, controllers, guards, and integration tests.
---

# RSC NestJS and TypeORM

## Respect boundaries

- Controllers own HTTP translation, guards, DTOs, and response metadata.
- Services own use cases and transaction boundaries.
- Domain modules own entities and repositories.
- Integrations remain behind adapters.
- Shared transport types live in `packages/contracts`, not entities.

## Design transactions

Read `references/transaction-patterns.md` for examples.

1. List every row and invariant affected by the use case.
2. Start the transaction at the service boundary.
3. Use repositories obtained from the transaction manager only.
4. Lock rows in a consistent order when concurrent writers are possible.
5. Use database uniqueness for durable idempotency.
6. Commit before realtime, email, push, or other external side effects.
7. Make post-commit side effects retryable.

## Query safely

- Prefer TypeORM APIs when they express the query accurately.
- Use parameterized SQL for PostgreSQL-specific locking, geospatial, CTE, or aggregate behavior.
- Explain why raw SQL is necessary.
- Keep GET requests free of persistent mutations.
- Avoid loading unbounded tables merely to paginate derived views.

## Change schema safely

- Add a migration for every schema change.
- Consider existing rows, defaults, constraints, indexes, and downgrade behavior.
- Use partial unique indexes for conditional invariants.
- Test migrations against realistic existing data.

## Verify

Test authorization, invalid transitions, duplicate requests, concurrent requests, rollback, and post-commit side-effect failure. Use integration tests when repository or transaction behavior matters.
