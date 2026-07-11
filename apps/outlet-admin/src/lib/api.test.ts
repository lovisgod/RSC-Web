import { describe, expect, it } from "vitest";

import { isActiveQueueOrder, type PosSubOrder } from "./api";

const readyOrder: PosSubOrder = {
  id: "sub-order-id",
  masterOrderId: "master-order-id",
  masterOrderStatus: "READY",
  status: "READY",
  deliveryMode: "DELIVERY",
  deliveryCode: "123456",
  items: [],
  totalAmountMinor: 100_000,
  createdAt: "2026-07-05T12:00:00.000Z",
  updatedAt: "2026-07-05T12:00:00.000Z",
};

describe("isActiveQueueOrder", () => {
  it("keeps active ready orders in the outlet queue", () => {
    expect(isActiveQueueOrder(readyOrder)).toBe(true);
  });

  it("removes delivered and cancelled master orders even when the sub-order is still ready", () => {
    expect(
      isActiveQueueOrder({
        ...readyOrder,
        masterOrderStatus: "DELIVERED",
      }),
    ).toBe(false);
    expect(
      isActiveQueueOrder({
        ...readyOrder,
        masterOrderStatus: "CANCELLED",
      }),
    ).toBe(false);
  });
});
