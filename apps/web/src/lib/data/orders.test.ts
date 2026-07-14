import { describe, expect, it } from "vitest";

import type { Order } from "./orders";
import {
  getStatusConfig,
  isActiveOrder,
  isCancelledOrder,
  isCompletedOrder,
  isProfileActiveOrder,
} from "./orders";

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
  it.each(["CONFIRMED", "PREPARING", "PARTIALLY_READY", "READY", "OUT_FOR_DELIVERY"])(
    "treats %s as active",
    (status) => expect(isActiveOrder(order(status))).toBe(true),
  );

  it.each(["PENDING_PAYMENT", "DELIVERED", "CANCELLED"])("does not treat %s as active", (status) =>
    expect(isActiveOrder(order(status))).toBe(false),
  );

  it.each(["PENDING_PAYMENT", "CONFIRMED", "PARTIALLY_READY", "READY", "OUT_FOR_DELIVERY"])(
    "shows %s in profile active orders",
    (status) => expect(isProfileActiveOrder(order(status))).toBe(true),
  );

  it("treats delivered orders as completed", () =>
    expect(isCompletedOrder(order("DELIVERED"))).toBe(true));

  it("does not treat cancelled orders as completed", () =>
    expect(isCompletedOrder(order("CANCELLED"))).toBe(false));

  it("treats cancelled orders as cancelled", () =>
    expect(isCancelledOrder(order("CANCELLED"))).toBe(true));

  it.each(["DELIVERED", "CONFIRMED", "PENDING_PAYMENT"])(
    "does not treat %s as cancelled",
    (status) => expect(isCancelledOrder(order(status))).toBe(false),
  );

  it("presents an unknown future status neutrally", () => {
    expect(getStatusConfig("AWAITING_HANDOFF")).toEqual({
      label: "Awaiting Handoff",
      color: "#4b5563",
      bg: "#f3f4f6",
    });
  });
});
