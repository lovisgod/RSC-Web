"use client";

import { Button, Card } from "@rsc/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ApiError } from "@rsc/api-client";
import type {
  InitiatePaymentInput,
  OrderDetail,
  OutletSummary,
  SubOrderDetail,
} from "@rsc/contracts";
import { OUTLETS_QUERY } from "@/src/hooks/use-outlets";
import { apiClient } from "@/src/lib/api";
import { formatNaira } from "@/src/lib/data/cart";
import { getStatusConfig, type Order } from "@/src/lib/data/orders";
import { useCartStore } from "@/src/stores/cart-store";

interface OrderCardProps {
  order: Order;
  variant?: "active" | "completed" | "cancelled";
  onViewDetails?: (order: Order) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function hydrateCartFromReorder(config: InitiatePaymentInput, outlets: OutletSummary[]) {
  const rows: Array<{
    outletId: string;
    outletName: string;
    item: {
      id: string;
      name: string;
      notes: string;
      quantity: number;
      unitPriceMinor: number;
      modifiers: { modifierId: string }[];
    };
  }> = [];
  const missingItems: string[] = [];

  for (const reorderItem of config.items) {
    const outlet = outlets.find((candidate) =>
      candidate.menuItems.some((item) => item.id === reorderItem.menuItemId),
    );
    const menuItem = outlet?.menuItems.find((item) => item.id === reorderItem.menuItemId);

    if (!outlet || !menuItem) {
      missingItems.push(reorderItem.menuItemId);
      continue;
    }

    const selectedModifiers = reorderItem.modifiers.filter((modifier) =>
      outlet.itemModifiers.some((candidate) => candidate.id === modifier.modifierId),
    );
    const modifierTotal = selectedModifiers.reduce((sum, modifier) => {
      const currentModifier = outlet.itemModifiers.find(
        (candidate) => candidate.id === modifier.modifierId,
      );
      return sum + (currentModifier?.priceDeltaMinor ?? 0);
    }, 0);

    rows.push({
      outletId: outlet.id,
      outletName: outlet.name,
      item: {
        id: menuItem.id,
        name: menuItem.name,
        notes: reorderItem.customerNote ?? "",
        quantity: reorderItem.quantity,
        unitPriceMinor: menuItem.priceMinor + modifierTotal,
        modifiers: selectedModifiers,
      },
    });
  }

  return { rows, missingItems };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getOrderDetailsHeaderStyle(status: string): CSSProperties {
  const normalizedStatus = status.toUpperCase();

  if (normalizedStatus === "CANCELLED") {
    return {
      background:
        "linear-gradient(135deg, var(--rsc-danger) 0%, color-mix(in srgb, var(--rsc-danger) 78%, black) 100%)",
    };
  }

  if (normalizedStatus === "PENDING_PAYMENT") {
    return {
      background: "linear-gradient(135deg, var(--rsc-brand-light) 0%, var(--rsc-brand) 100%)",
    };
  }

  if (normalizedStatus === "READY") {
    return {
      background:
        "linear-gradient(135deg, var(--rsc-success) 0%, color-mix(in srgb, var(--rsc-success) 78%, black) 100%)",
    };
  }

  if (normalizedStatus === "PARTIALLY_FULFILLED" || normalizedStatus === "PARTIALLY_READY") {
    return {
      background: "linear-gradient(135deg, var(--rsc-brand) 0%, var(--rsc-brand-strong) 100%)",
    };
  }

  return {
    background: "linear-gradient(135deg, var(--rsc-main) 0%, var(--rsc-navy-light) 100%)",
  };
}

function OrderDetailsContent({
  detail,
  outletNameById,
}: {
  detail: OrderDetail;
  outletNameById: Map<string, string>;
}) {
  const subOrders =
    detail.subOrders.length > 0
      ? detail.subOrders
      : Array.from(new Set(detail.lineItems.map((item) => item.subOrderId))).map(
          (subOrderId): SubOrderDetail => {
            const items = detail.lineItems.filter((item) => item.subOrderId === subOrderId);

            return {
              id: subOrderId,
              masterOrderId: detail.order.id,
              outletId: items[0]?.outletId ?? subOrderId,
              status: detail.order.status,
              subtotalMinor: items.reduce((sum, item) => sum + item.lineTotalMinor, 0),
              commissionMinor: 0,
              netMinor: 0,
              currency: detail.order.currency,
              createdAt: detail.order.createdAt,
            };
          },
        );

  if (detail.lineItems.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
        No item breakdown was returned for this order.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subOrders.map((subOrder, index) => {
        const items = detail.lineItems.filter((item) => item.subOrderId === subOrder.id);
        const outletName = outletNameById.get(subOrder.outletId) ?? `Outlet ${index + 1}`;

        return (
          <section className="rounded-2xl border border-gray-100 bg-white p-4" key={subOrder.id}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-[var(--rsc-main)] sm:text-base">
                  {outletName}
                </h3>
                <p className="mt-0.5 text-xs font-semibold uppercase text-gray-400">
                  {formatStatusLabel(subOrder.status)}
                </p>
              </div>
              <p className="rounded-full bg-[var(--rsc-panel)] px-3 py-1 text-sm font-bold text-[var(--rsc-main)]">
                {formatNaira(subOrder.subtotalMinor)}
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {items.map((item) => (
                <div className="py-3" key={item.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <span className="mt-0.5 inline-flex h-8 min-w-8 items-center justify-center rounded-xl bg-orange-50 px-2 text-sm font-black text-[var(--rsc-main)]">
                        {item.quantity}×
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900">{item.itemNameSnapshot}</p>
                        {item.modifiersSnapshot.length > 0 && (
                          <p className="mt-1 text-sm text-gray-500">
                            {item.modifiersSnapshot
                              .map((modifier) =>
                                modifier.priceDeltaMinor > 0
                                  ? `${modifier.name} (+${formatNaira(modifier.priceDeltaMinor)})`
                                  : modifier.name,
                              )
                              .join(", ")}
                          </p>
                        )}
                        {item.customerNote && (
                          <p className="mt-2 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-800">
                            Note: {item.customerNote}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-black text-[var(--rsc-main)]">
                        {formatNaira(item.lineTotalMinor)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatNaira(item.unitPriceMinor)} each
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function OrderDetailsModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const detailQuery = useQuery({
    queryKey: ["order", order.id],
    queryFn: () => apiClient.getOrder(order.id),
  });
  const outletsQuery = useQuery(OUTLETS_QUERY);

  const outletNameById = useMemo(() => {
    const entries = (outletsQuery.data ?? []).map((outlet) => [outlet.id, outlet.name] as const);
    return new Map(entries);
  }, [outletsQuery.data]);

  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-y-0 left-0 right-0 z-50 flex items-center justify-center bg-slate-950/45 px-3 py-4 backdrop-blur-sm sm:px-6 md:left-60"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] border border-white/30 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-5 text-white sm:p-6" style={getOrderDetailsHeaderStyle(order.status)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/55">
                Order receipt
              </p>
              <h2 className="mt-2 text-2xl font-black">#{order.id.slice(0, 8).toUpperCase()}</h2>
              <p className="mt-1 text-sm text-white/65">{formatDateTime(order.createdAt)}</p>
            </div>
            <button
              aria-label="Close order details"
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              type="button"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Status</p>
              <p className="mt-1 font-black">{formatStatusLabel(order.status)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                Fulfillment
              </p>
              <p className="mt-1 font-black">
                {order.deliveryMode === "DELIVERY" ? "Delivery" : "Takeout"}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                Order total
              </p>
              <p className="mt-1 font-black">{formatNaira(order.totalMinor)}</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4 sm:p-5">
          {detailQuery.isPending && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 py-10 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading order contents...
            </div>
          )}

          {detailQuery.isError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              Could not load the items in this order. Please try again.
            </div>
          )}

          {detailQuery.data && (
            <OrderDetailsContent detail={detailQuery.data} outletNameById={outletNameById} />
          )}
        </div>
      </div>
    </div>
  );
}

export function OrderCard({ order, variant = "completed", onViewDetails }: OrderCardProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const status = getStatusConfig(order.status);
  const isPendingPayment = order.status.toUpperCase() === "PENDING_PAYMENT";
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clear);

  const retryPaymentMutation = useMutation({
    mutationFn: () =>
      apiClient.retryPayment(order.id, {
        returnUrl: `${window.location.origin}/payment/return`,
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });

      if (!result.checkoutUrl) {
        toast.error("Payment provider currently unavailable. Please try again later.");
        return;
      }

      window.location.assign(result.checkoutUrl);
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.message : "Could not restart payment. Please try again.",
      );
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async () => {
      const config = await apiClient.reorder(order.id);
      const outlets = await queryClient.ensureQueryData(OUTLETS_QUERY);
      return hydrateCartFromReorder(config, outlets);
    },
    onSuccess: ({ rows, missingItems }) => {
      if (rows.length === 0) {
        toast.error("Those items are no longer available for reorder.");
        return;
      }

      clearCart();
      rows.forEach((row) => addItem(row));

      if (missingItems.length > 0) {
        toast.warning("Some previous items are no longer available and were skipped.");
      } else {
        toast.success("Previous order loaded into your cart.");
      }

      router.push("/cart");
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.message : "Could not place reorder. Please try again.",
      );
    },
  });

  const refundMutation = useMutation({
    mutationFn: () => {
      if (!order.paymentReference) {
        throw new Error("This order does not have a payment reference for refund.");
      }

      return apiClient.requestRefund(order.paymentReference, {
        reason: "Customer requested refund for cancelled order",
      });
    },
    onSuccess: (refund) => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(
        refund.status === "SUCCESS"
          ? "Refund processed successfully."
          : "Refund request has been submitted.",
      );
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 403) {
        toast.error("Refunds must be processed by an RSC admin. Please contact support.");
        return;
      }

      toast.error(err instanceof ApiError ? err.message : "Could not process refund right now.");
    },
  });

  function stopCardOpen(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (onViewDetails) {
        onViewDetails(order);
      } else {
        setIsDetailsOpen(true);
      }
    }
  }

  return (
    <>
      <Card
        aria-label={`View details for order ${order.id.slice(0, 8).toUpperCase()}`}
        className="space-y-3 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md"
        role="button"
        tabIndex={0}
        onClick={() => {
          if (onViewDetails) {
            onViewDetails(order);
          } else {
            setIsDetailsOpen(true);
          }
        }}
        onKeyDown={handleCardKeyDown}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold leading-tight text-gray-900">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </h3>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: status.bg, color: status.color }}
              >
                {status.label}
              </span>
            </div>

            <p className="mt-1 text-sm font-semibold text-gray-700">
              {formatNaira(order.totalMinor)}
            </p>

            {order.deliveryAddress && (
              <p className="mt-0.5 truncate text-xs text-gray-400">→ {order.deliveryAddress}</p>
            )}

            <p className="mt-1 text-xs text-gray-400">
              {order.deliveryMode === "DELIVERY" ? "Delivery" : "Takeout"} ·{" "}
              {formatDate(order.createdAt)}
            </p>

            {variant === "active" && !isPendingPayment && order.deliveryCode && (
              <p className="mt-2 text-xs font-semibold text-gray-600">
                Delivery code: <span className="font-mono">{order.deliveryCode}</span>
              </p>
            )}
          </div>

          {variant === "completed" ? (
            <Button
              tone="primary"
              type="button"
              onClick={(event) => {
                stopCardOpen(event);
                reorderMutation.mutate();
              }}
              disabled={reorderMutation.isPending}
            >
              {reorderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reorder"}
            </Button>
          ) : variant === "cancelled" ? (
            <Button
              tone="danger"
              type="button"
              onClick={(event) => {
                stopCardOpen(event);
                refundMutation.mutate();
              }}
              disabled={refundMutation.isPending}
            >
              {refundMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refund"}
            </Button>
          ) : (
            <Button
              tone="primary"
              type="button"
              className={`!rounded-lg ${isPendingPayment ? "!px-2 !py-2" : "!px-4 !py-1.5"}`}
              onClick={(event) => {
                stopCardOpen(event);
                if (isPendingPayment) {
                  retryPaymentMutation.mutate();
                  return;
                }

                router.push(`/tracking?orderId=${order.id}`);
              }}
              disabled={retryPaymentMutation.isPending}
            >
              {retryPaymentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPendingPayment ? (
                "Make payment"
              ) : (
                "Track"
              )}
            </Button>
          )}
        </div>
      </Card>
      {isDetailsOpen && <OrderDetailsModal order={order} onClose={() => setIsDetailsOpen(false)} />}
    </>
  );
}
