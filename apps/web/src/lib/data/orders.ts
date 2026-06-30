import { type MasterOrderStatus, type OrderSummary } from "@rsc/contracts";

export type Order = OrderSummary;

export const ACTIVE_STATUSES: MasterOrderStatus[] = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PARTIALLY_READY",
  "READY",
  "OUT_FOR_DELIVERY",
];

export const COMPLETED_STATUSES: MasterOrderStatus[] = ["DELIVERED", "CANCELLED"];

export function isActiveOrder(order: Order): boolean {
  return ACTIVE_STATUSES.includes(order.status);
}

export function isCompletedOrder(order: Order): boolean {
  return COMPLETED_STATUSES.includes(order.status);
}

export const STATUS_CONFIG: Record<
  MasterOrderStatus,
  { label: string; color: string; bg: string }
> = {
  PENDING_PAYMENT: { label: "Pending payment", color: "#fff", bg: "var(--rsc-danger)" },
  CONFIRMED: { label: "Confirmed", color: "#fff", bg: "var(--rsc-navy-light)" },
  PARTIALLY_READY: { label: "Partially ready", color: "#fff", bg: "var(--rsc-dark)" },
  READY: { label: "Ready for pickup", color: "#fff", bg: "var(--rsc-main)" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", color: "#fff", bg: "var(--rsc-dark)" },
  DELIVERED: { label: "Delivered", color: "#fff", bg: "var(--rsc-main)" },
  CANCELLED: { label: "Cancelled", color: "#fff", bg: "#6b7280" },
};
