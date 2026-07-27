# Change Impact Matrix

| Area       | Inspect                                                           | Minimum verification            |
| ---------- | ----------------------------------------------------------------- | ------------------------------- |
| API input  | DTO, validation pipe, contracts, API client, mobile compatibility | Unit + E2E request              |
| API output | serializer, contracts, API client, all UI consumers               | Contract + consumer tests       |
| Database   | entity, migration, indexes, existing rows, rollback               | Migration and integration test  |
| Payments   | provider docs, amount, currency, idempotency, webhook order       | Adapter + service + integration |
| Orders     | master/sub-order state derivation, actor permissions, events      | State matrix tests              |
| Realtime   | room authorization, payload, commit order, multiple replicas      | Socket integration test         |
| Deployment | Compose interpolation, health checks, migration image, secrets    | Rendered config + smoke test    |
| UI         | loading, empty, error, responsive and session behavior            | Component + browser test        |

## Compatibility questions

- Can an older web or mobile client still send its current payload?
- Are existing response fields unchanged in name, type, presence, and meaning?
- Can retries create duplicate money movement, orders, refunds, or notifications?
- Does a GET request mutate state?
- Does a 5xx response destroy a valid session?
- Will the change work with two API replicas?
