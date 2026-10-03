---
name: rsc-change-safety
description: Safely plan, implement, review, and verify changes in the RSC monorepo. Use for cross-app changes, API or contract edits, migrations, payment/order workflows, deployment changes, release preparation, regression checks, or any request that may affect web, mobile, admin, outlet-admin, API, or production behavior.
---

# RSC Change Safety

## Establish context

1. Read the root `AGENTS.md`, the nearest app `AGENTS.md`, and the relevant files under `docs/`.
2. Inspect `git status` before editing. Preserve unrelated work.
3. Identify the owning package and every consumer before changing a shared behavior.
4. Classify the change using `references/change-impact.md`.

## Protect public behavior

- Treat `packages/contracts` as the transport source of truth.
- Compare request shapes, response shapes, enums, nullability, defaults, pagination, errors, and realtime payloads before and after the change.
- Keep existing clients compatible unless the request explicitly authorizes a versioned breaking change.
- Do not expose TypeORM entities as API contracts.
- Call out behavioral changes even when the JSON shape is unchanged.

## Implement safely

- Keep money in integer minor units.
- Treat payment and order transitions as server-authoritative.
- Use migrations for database changes; never enable schema synchronization.
- Make retries, concurrency, authorization, idempotency, and partial failure explicit.
- Keep external network calls outside long database transactions unless the provider contract requires otherwise.
- Emit realtime events and send notifications after durable state commits.

## Reuse before writing

Before adding any helper (formatting, money math, dates, phone, validation, parsing), search the shared packages first:

```bash
grep -rn "export function\|export const" packages/ui/src packages/contracts/src packages/api-client/src
grep -rniE "<concept>" packages/*/src apps/*/src   # e.g. kobo|naira|format|round
```

- If a shared helper exists, import it. Do not copy or re-implement it inline.
- If the logic is needed in more than one app, add it to the owning package (`@rsc/ui` for presentation helpers, `@rsc/contracts` for schemas/enums) and export it from the package `index.ts`. Do not duplicate it per app.
- If you find a local duplicate while working in a file you are already changing, replace it with the shared helper. Leave other duplicates alone and list them in your report.

Known shared money helpers (`@rsc/ui`, `packages/ui/src/money.ts`):

| Helper               | Use                                                       |
| -------------------- | --------------------------------------------------------- |
| `formatNaira(minor)` | Display a minor-unit amount; shows kobo only when present |
| `formatMoney(money)` | Same, for `Money` contract objects                        |
| `hasKobo(minor)`     | Whether a minor-unit amount has a fractional naira part   |
| `roundToKobo(naira)` | Round a major-unit form value to 2 decimals               |

Never format money with `maximumFractionDigits: 0`. It silently drops kobo.

## Verify

Run `scripts/run-change-gate.sh`. Add focused integration, E2E, or browser tests when the change crosses a process boundary.

Before reporting completion:

1. Review `git diff --check` and the complete diff.
2. State any request, response, enum, event, environment, migration, or deployment change.
3. State what was not tested.
4. Never describe a change as non-breaking solely because tests pass.
