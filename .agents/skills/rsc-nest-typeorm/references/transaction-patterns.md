# Transaction Patterns

## Locked state transition

```ts
await dataSource.transaction(async (manager) => {
  const orders = manager.getRepository(MasterOrder);
  const order = await orders.findOne({
    where: { id: orderId },
    lock: { mode: "pessimistic_write" },
  });

  if (!order) throw new NotFoundException();
  assertTransition(order.status, nextStatus);
  order.status = nextStatus;
  await orders.save(order);
});
```

Use only transaction-scoped repositories inside the callback.

## Idempotent insert

```sql
INSERT INTO operation_events (provider, event_id, payload)
VALUES ($1, $2, $3)
ON CONFLICT (provider, event_id) DO NOTHING
RETURNING id;
```

An empty result means the operation was previously recorded. Avoid catching a unique violation inside a PostgreSQL transaction because the transaction remains aborted.

## Work queue claim

Use `FOR UPDATE SKIP LOCKED` when multiple workers claim independent rows. Keep candidate selection and assignment in the same transaction.

## External call

Persist a local operation and idempotency key first, commit it, call the provider, then update the local result in a second transaction. A retry must reuse the same provider idempotency key.
