# Web architecture

## Dependency direction

```text
apps/web ───┐
            ├──> packages/api-client ───> packages/contracts
apps/admin ─┘

apps/web ───┐
            └──> packages/ui
apps/admin ─┘
```

Shared packages never import from applications. `contracts` has no React or
framework dependency. `api-client` has no UI dependency.

## Application responsibilities

### Customer web

Next.js App Router owns public metadata and rendering, customer navigation,
authenticated account screens, cart/checkout UI, and order tracking. Public
catalog routes may be cached, but price, availability, delivery eligibility,
and checkout totals must be revalidated by the API.

### Central admin

The Vite SPA owns central operations. TanStack Query manages server state.
Permission checks improve UX, but the API remains the authorization boundary.
Large or sensitive exports should be generated server-side and downloaded via
short-lived links.

## State boundaries

- Server state: TanStack Query.
- Route state: URL/search parameters.
- Form state: local state or React Hook Form when forms become complex.
- Durable customer cart: a small Zustand store with versioned persistence.
- Real-time events: update/invalidate query cache; never become the only source
  of truth.

## API boundary

`@rsc/api-client` receives a base URL and an optional token/session strategy. It
parses unknown responses through `@rsc/contracts`. Provider-specific payment,
maps, notification, and media details do not leak into core UI contracts.

## Security baseline

- Prefer secure HttpOnly, SameSite cookies for browser sessions.
- Add CSRF protection to state-changing cookie-authenticated requests.
- Apply CSP and explicit third-party script allowlists.
- Keep payment confirmation webhook-authoritative.
- Redact PII and secrets from telemetry.
- Require step-up/explicit confirmation for refunds, settlement approval, role
  changes, and destructive outlet actions.

## Testing

- Contract tests: schema parsing and status/amount invariants.
- Unit tests: cart calculations and UI behavior.
- Component tests: forms, tables, error states, and permissions.
- E2E: customer purchase recovery path and central order/settlement workflows.
