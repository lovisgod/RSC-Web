import { describe, expect, it } from "vitest";

import type { Order } from "./orders";
import { getStatusConfig, isActiveOrder, isCompletedOrder, isProfileActiveOrder } from "./orders";

function order(status: string): Order {
  return {
    id: "2abf9577-027c-4936-83a8-e004fd56a46e",
    customerId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
    riderId: null,
    status,
    subtotalMinor: 1_000,
    deliveryFeeMinor: 0,
    serviceFeeMinor: 0,
    vatMinor: 0,
    discountMinor: 0,
    totalMinor: 1_000,
    currency: "NGN",
    deliveryMode: "DELIVERY",
    deliveryAddress: null,
    deliveryLatitude: null,
    deliveryLongitude: null,
    paymentReference: null,
    deliveryCode: null,
    createdAt: "2026-07-04T10:00:00.000Z",
    updatedAt: "2026-07-04T10:00:00.000Z",
    deletedAt: null,
  };
}

describe("customer order status grouping", () => {
  it.each([
    "CONFIRMED",
    "PREPARING",
    "PARTIALLY_READY",
    "PARTIALLY_FULFILLED",
    "READY",
    "OUT_FOR_DELIVERY",
  ])("treats %s as active", (status) => expect(isActiveOrder(order(status))).toBe(true));

  it.each(["PENDING_PAYMENT", "DELIVERED", "CANCELLED"])("does not treat %s as active", (status) =>
    expect(isActiveOrder(order(status))).toBe(false),
  );

  it.each([
    "PENDING_PAYMENT",
    "CONFIRMED",
    "PARTIALLY_READY",
    "PARTIALLY_FULFILLED",
    "READY",
    "OUT_FOR_DELIVERY",
  ])("shows %s in profile active orders", (status) =>
    expect(isProfileActiveOrder(order(status))).toBe(true),
  );

  it.each(["DELIVERED", "CANCELLED"])("treats %s as completed", (status) =>
    expect(isCompletedOrder(order(status))).toBe(true),
  );

  it("presents an unknown future status neutrally", () => {
    expect(getStatusConfig("AWAITING_HANDOFF")).toEqual({
      label: "Awaiting Handoff",
      color: "#4b5563",
      bg: "#f3f4f6",
    });
  });
});
