# Project context

## Product

RSC is a multi-outlet food ordering platform for the Nigerian market. A customer
can browse dishes from several RSC outlets, combine them in one cart, complete a
single checkout, and track fulfillment. Internally, the platform splits the
customer's master order into one sub-order per outlet.

Central staff need cross-platform visibility into orders, outlet availability,
payments, settlements, delivery operations, reports, and system health.

## Current web scope

This repository contains:

- The customer web application.
- The central admin dashboard.
- The NestJS API 
- Shared contracts, API client, and UI primitives.

The NestJS API, Android outlet POS, Flutter mobile app, and rider app are
adjacent systems, not implemented here. Their future contracts must still be
considered when designing shared domain language.

## Primary actors

- Customer: browses, orders, pays, tracks, cancels where permitted, and reorders.
- Super admin: platform-wide operations and finance authority.
- Outlet admin/operator: manages one outlet's menu and sub-orders, primarily
  through the outlet POS unless product scope changes.
- Rider/dispatcher: receives or coordinates delivery work in a later phase.
- Support/finance staff: expected future permission sets; do not hard-code all
  central staff as one unlimited role.

## Core journeys

1. Discover outlets and menus.
2. Configure items and maintain a multi-outlet cart.
3. Validate delivery/takeout eligibility and price.
4. Create one master order and outlet-specific sub-orders.
5. Complete one payment and wait for server-confirmed payment status.
6. Track preparation, readiness, dispatch, and delivery.
7. Reconcile payments and approve settlements with an audit trail.

## Drafts versus decisions

Source materials are discovery inputs. Some details are deliberately not copied
as final architecture:

- Framework versions are refreshed at implementation time.
- Payment-provider specifics remain behind an adapter until capabilities are
  verified.
- Database decimals are sensible, but browser/application contracts use integer
  minor units to avoid floating-point money bugs.
- Backend entities are not shared directly with web applications.
- WebSocket delivery is an enhancement; recovery must work through query
  invalidation/refetching.
- RLS is defense in depth, not a substitute for application authorization.
