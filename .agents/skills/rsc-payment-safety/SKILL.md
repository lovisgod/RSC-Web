---
name: rsc-payment-safety
description: Design, implement, debug, or review RSC payment, refund, settlement, reconciliation, promo, pricing, and provider-integration workflows. Use for Moment or Paystack adapters, checkout totals, webhooks, retries, split payments, subaccounts, refunds, settlement approval, and financial reporting.
---

# RSC Payment Safety

## Start from authoritative contracts

1. Read current official provider documentation before coding. Do not infer undocumented endpoints.
2. Read the payment adapter interface, payment entities, migrations, contracts, and checkout consumers.
3. Write down the invariant being changed using `references/payment-invariants.md`.

## Preserve financial correctness

- Calculate subtotal, VAT, delivery, commission, discount, and total on the server.
- Store and transmit money in integer minor units with an explicit currency.
- Validate provider webhook amount, currency, reference, signature, and event identity.
- Require provider idempotency keys for money-moving calls.
- Record webhook deduplication and state changes in one database transaction.
- Lock payment/refund rows when concurrent requests could overspend a refundable balance.
- Persist a local operation identity before calling a provider so retries can resume safely.
- Never silently fall back to a fake or always-successful adapter outside tests.

## Separate durable state from side effects

1. Commit payment/order/refund state.
2. Emit realtime events and notifications after commit.
3. Make failed side effects retryable without repeating money movement.

## Review provider support

- Fail explicitly when Moment or another provider does not document a required capability.
- Never fabricate subaccount codes, refund IDs, settlement results, or successful verification.
- Keep provider payloads behind the adapter boundary and redact them from logs.

## Verify

Test duplicate delivery, out-of-order delivery, amount mismatch, invalid signature, provider timeout, retry, partial refund, concurrent refund, and notification failure. Include an integration test for every money-moving transaction boundary.
