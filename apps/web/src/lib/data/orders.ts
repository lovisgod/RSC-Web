import type { CustomerOrder } from "@rsc/contracts";

export type Order = CustomerOrder;

const COMPLETED_STATUS = "COMPLETED";

export function isActiveOrder(order: Order): boolean {
  return order.status.toUpperCase() !== COMPLETED_STATUS;
}

export function isCompletedOrder(order: Order): boolean {
  return order.status.toUpperCase() === COMPLETED_STATUS;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_PAYMENT: { label: "Pending payment", color: "#fff", bg: "var(--rsc-danger)" },
  CONFIRMED: { label: "Confirmed", color: "#fff", bg: "var(--rsc-navy-light)" },
  PARTIALLY_READY: { label: "Partially ready", color: "#fff", bg: "var(--rsc-dark)" },
  READY: { label: "Ready for pickup", color: "#fff", bg: "var(--rsc-main)" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", color: "#fff", bg: "var(--rsc-dark)" },
  COMPLETED: { label: "Completed", color: "#fff", bg: "var(--rsc-main)" },
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
      color: "#fff",
      bg: "var(--rsc-navy-light)",
    }
  );
}
