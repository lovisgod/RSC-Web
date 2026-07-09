import { describe, expect, it } from "vitest";

import { getUnseenIncomingOrderIds } from "./use-new-order-alert";

describe("getUnseenIncomingOrderIds", () => {
  it("returns only unseen orders that have not been accepted", () => {
    const orders = [
      { id: "new-pending", status: "PENDING" as const },
      { id: "seen-pending", status: "PENDING" as const },
      { id: "accepted", status: "ACCEPTED" as const },
      { id: "preparing", status: "PREPARING" as const },
      { id: "ready", status: "READY" as const },
    ];

    expect(getUnseenIncomingOrderIds(orders, new Set(["seen-pending"]))).toEqual(["new-pending"]);
  });

  it("does not re-alert an incoming order already seen during the session", () => {
    const orders = [{ id: "known-order", status: "PENDING" as const }];

    expect(getUnseenIncomingOrderIds(orders, new Set(["known-order"]))).toEqual([]);
  });
});
