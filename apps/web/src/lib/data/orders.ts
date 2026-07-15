import type { CustomerOrder } from "@rsc/contracts";

export type Order = CustomerOrder;

export const ACTIVE_ORDER_STATUSES = new Set([
  "CONFIRMED",
  "PREPARING",
  "PARTIALLY_READY",
  "PARTIALLY_FULFILLED",
  "READY",
  "OUT_FOR_DELIVERY",
]);

export function isActiveOrder(order: Order): boolean {
  return ACTIVE_ORDER_STATUSES.has(order.status.toUpperCase());
}

export function isProfileActiveOrder(order: Order): boolean {
  return order.status.toUpperCase() === "PENDING_PAYMENT" || isActiveOrder(order);
}

export function isCompletedOrder(order: Order): boolean {
  return order.status.toUpperCase() === "DELIVERED";
}

export function isCancelledOrder(order: Order): boolean {
  return order.status.toUpperCase() === "CANCELLED";
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_PAYMENT: { label: "Pending payment", color: "#fff", bg: "var(--rsc-danger)" },
  CONFIRMED: { label: "Confirmed", color: "#fff", bg: "var(--rsc-navy-light)" },
  PREPARING: { label: "Preparing", color: "#fff", bg: "var(--rsc-navy-light)" },
  PARTIALLY_READY: { label: "Partially ready", color: "#fff", bg: "var(--rsc-dark)" },
  PARTIALLY_FULFILLED: { label: "Partially fulfilled", color: "#fff", bg: "var(--rsc-danger)" },
  READY: { label: "Ready for pickup", color: "#fff", bg: "var(--rsc-success)" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", color: "#fff", bg: "var(--rsc-dark)" },
  DELIVERED: { label: "Delivered", color: "#fff", bg: "var(--rsc-main)" },
  CANCELLED: { label: "Cancelled", color: "#fff", bg: "#6b7280" },
};

export function getStatusConfig(status: string) {
  const normalizedStatus = status.toUpperCase();

  return (
    STATUS_CONFIG[normalizedStatus] ?? {
      label: normalizedStatus
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      color: "#4b5563",
      bg: "#f3f4f6",
    }
  );
}
