# Central admin agent guide

- This app is for central RSC staff, not the outlet POS.
- Use TanStack Query for remote state and URL parameters for filters.
- Treat all counts, finance values, and statuses as server-derived.
- Permission-aware UI is not authorization; the API must enforce every action.
- Refund, settlement, role, and destructive outlet actions need explicit
  confirmation and auditable reason capture.
- Operational tables must support loading, empty, stale, partial-failure, and
  export states.
- Never render raw error payloads or customer PII in telemetry/system-health UI.
