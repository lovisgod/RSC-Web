# Domain model notes

## Aggregate shape

- `MasterOrder`: customer-visible commercial order and payment context.
- `SubOrder`: one outlet's fulfillment workload within a master order.
- `OrderLineItem`: immutable checkout snapshot of an item and selected modifiers.
- `Payment`: one or more attempts/references associated with a master order.
- `Settlement`: auditable calculation/approval record for outlet payout.

## Important corrections to the draft

- Payment attempts should not be forced into a one-payment-per-order shape.
  Retries and provider callbacks require an append-friendly attempt history.
- `payment_ref` duplicated on `master_orders` can drift from `payments`; expose a
  derived/current payment view rather than two independent sources of truth.
- Notification recipients should eventually use explicit typed references or
  separate recipient columns; a polymorphic UUID without a foreign key is weak.
- One `fcm_token` per user/rider is insufficient for multiple devices. Model
  notification endpoints separately in the backend.
- Order status must be a validated state machine, not an unrestricted enum
  update.
- Settlement reports must use explicit parentheses in SQL predicates and should
  be based on immutable ledger entries, not reconstructed solely from mutable
  fulfillment rows.
- Geospatial columns should use `geography` where distance in meters is central,
  or apply explicit geography casts.
- Prefer `gen_random_uuid()` via `pgcrypto` in new PostgreSQL designs unless the
  backend team has a reason to retain `uuid-ossp`.

## Web contract conventions

- IDs are opaque UUID strings.
- Timestamps are ISO 8601 strings in UTC.
- Money is `{ amountMinor, currency }`, currently with `currency: "NGN"`.
- Status strings are uppercase API values; presentation labels live in UI code.
- Historical order lines carry snapshots. Catalog objects remain links, not
  historical truth.
