# Payment Invariants

- One master order has one authoritative payable total and currency.
- A successful payment amount must equal the server-authoritative order total.
- A provider event is processed at most once.
- An early provider event must remain retryable until its local payment exists.
- A successful payment confirms an eligible pending order exactly once.
- Total successful and reserved refunds cannot exceed the successful payment.
- Customer refund requests do not move money until approved.
- Settlement approval cannot occur while the settlement business date is active.
- Every outlet settlement code is real, unique, nonblank, and provider-issued.
- Reconciliation exports come from the provider when provider reconciliation is requested.

When an invariant changes, update domain documentation and add a state-matrix test.
