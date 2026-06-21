# TODO

This backlog starts at architecture foundation. Items are intentionally ordered
so another agent can safely pick the first unchecked task.

## P0 — Decisions and contracts

- [ ] Confirm API ownership and publish the first OpenAPI document.
- [ ] Confirm payment provider capabilities, webhook signing, split settlement,
      refund, and idempotency behavior before provider-specific implementation.
- [ ] Decide whether checkout supports guest users at launch.
- [ ] Define the master-order and sub-order transition matrices, including
      partial rejection, cancellation, refund, and timeout paths.
- [ ] Define delivery pricing and single-rider vs multi-rider business rules.
- [ ] Confirm whether outlet operators use a separate POS only or also require a
      web dashboard.
- [ ] Replace draft tax/fee assumptions with finance-approved configuration.

## P1 — Platform foundation

- [ ] Add CI for format, lint, typecheck, unit tests, and production builds.
- [ ] Add changesets or an equivalent package versioning policy.
- [ ] Add environment validation per app.
- [ ] Generate contracts/client code from OpenAPI while retaining runtime
      validation at trust boundaries.
- [ ] Establish authentication session handling and CSRF protection.
- [ ] Add Sentry with privacy-safe scrubbing and release metadata.
- [ ] Add Storybook or a focused component playground for `@rsc/ui`.

## P1 — Customer web

- [ ] Implement outlet discovery and outlet menu routes.
- [ ] Implement modifier-aware cart with deterministic price calculation.
- [ ] Persist cart safely and reconcile stale menu prices/availability.
- [ ] Implement address capture and server-validated delivery eligibility.
- [ ] Implement checkout initiation with idempotency keys.
- [ ] Implement payment return/recovery states and webhook-confirmed success.
- [ ] Implement order history, re-order, draft order, and live tracking.
- [ ] Add metadata, sitemap, robots policy, and structured data for public pages.

## P1 — Central admin

- [ ] Implement admin authentication and permission-aware navigation.
- [ ] Build platform overview metrics with date/outlet filters.
- [ ] Build master-order and sub-order operations views.
- [ ] Build outlet configuration and availability controls.
- [ ] Build settlement review, approval, export, and immutable audit trail views.
- [ ] Build refund/dispute workflow with explicit approval boundaries.
- [ ] Build delivery/rider oversight map behind a feature flag.
- [ ] Build system health and error-log links without exposing sensitive payloads.

## P2 — Quality and operations

- [ ] Add unit tests for contracts, cart pricing, status labels, and API errors.
- [ ] Add Playwright journeys for browse → cart → checkout and admin order triage.
- [ ] Add accessibility checks and keyboard-only smoke tests.
- [ ] Define performance budgets and monitor customer LCP/INP.
- [ ] Add mock service worker fixtures for independent frontend development.
- [ ] Document release, rollback, incident, and support procedures.
