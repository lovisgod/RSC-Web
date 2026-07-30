"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { OrderLineItem, SubOrderDetail } from "@rsc/contracts";
import { Card, EmptyState } from "@rsc/ui";
import { Bike, ChevronDown, MapPin, RefreshCw, Store, Wifi, WifiOff } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useOrderDetail, useRiderTracking } from "@/src/hooks/use-order-tracking";
import { useCartStore } from "@/src/stores/cart-store";
import { useActiveOrders } from "@/src/hooks/use-orders";
import { useOutlets } from "@/src/hooks/use-outlets";
import { apiClient } from "@/src/lib/api";
import { formatNaira } from "@/src/lib/data/cart";
import { getStatusConfig, type Order } from "@/src/lib/data/orders";
import { PaymentResultModal } from "@/src/components/payment/payment-result-modal";
import { OrderTimeline } from "./order-timeline";

const TrackingMap = dynamic(() => import("./tracking-map"), { ssr: false });

const MASTER_STATUS_MESSAGES: Record<string, string> = {
  CONFIRMED: "Your order is confirmed and has been sent to the Outlets.",
  PREPARING: "Your order is being prepared.",
  PARTIALLY_READY: "Some kitchens are ready while the others finish preparing.",
  PARTIALLY_FULFILLED:
    "Part of your order cannot be fulfilled. The remaining outlets are still active.",
  READY: "All Outlets are ready. Your order is waiting for rider handoff.",
  OUT_FOR_DELIVERY: "Your rider has your order and is heading to you.",
  DELIVERED: "Your order has been delivered.",
  CANCELLED: "This order was cancelled.",
};

const SUB_ORDER_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  PARTIALLY_READY: "Partially ready",
  PARTIALLY_FULFILLED: "Partially fulfilled",
  READY: "Ready",
  REJECTED: "Unable to fulfil",
  CANCELLED: "Cancelled",
};

function NoActiveOrder() {
  return (
    <EmptyState
      icon={
        <Image
          src="/icons/png/round-pushpin_1f4cd.png"
          alt=""
          width={48}
          height={48}
          className="object-contain"
        />
      }
      heading="No active order to track"
      body="Place an order and live delivery updates will appear here."
      action={
        <Link
          href="/menu"
          className="text-sm font-semibold hover:underline"
          style={{ color: "var(--rsc-brand)" }}
        >
          Browse Outlets
        </Link>
      }
    />
  );
}

function TrackingPageSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading active orders">
      <Card className="overflow-hidden border-gray-100 shadow-[0_12px_30px_rgba(30,49,96,0.07)]">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-28 animate-pulse rounded-full bg-gray-200" />
            <div className="h-3 w-44 animate-pulse rounded-full bg-gray-100" />
            <div className="h-9 w-40 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--rsc-brand)_10%,white)]" />
          </div>
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-100" />
        </div>
      </Card>

      <Card className="overflow-hidden border-t-4 border-t-[var(--rsc-brand)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--rsc-main)_92%,white)_0%,var(--rsc-main)_100%)] shadow-[0_18px_45px_rgba(30,49,96,0.14)]">
        <div className="space-y-3">
          <div className="h-3 w-28 animate-pulse rounded-full bg-white/25" />
          <div className="h-6 w-36 animate-pulse rounded-full bg-white/35" />
          <div className="h-4 w-full max-w-sm animate-pulse rounded-full bg-white/20" />
        </div>
      </Card>

      <Card className="space-y-4 border-gray-100 shadow-[0_12px_32px_rgba(30,49,96,0.06)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--rsc-main)_10%,white)]" />
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded-full bg-gray-200" />
              <div className="h-3 w-40 animate-pulse rounded-full bg-gray-100" />
            </div>
          </div>
          <div className="h-7 w-16 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--rsc-brand)_10%,white)]" />
        </div>

        <div className="rounded-2xl border border-gray-100 p-4">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-100" />
              <div className="space-y-2">
                <div className="h-4 w-36 animate-pulse rounded-full bg-gray-200" />
                <div className="h-3 w-20 animate-pulse rounded-full bg-gray-100" />
              </div>
            </div>
            <div className="h-7 w-20 animate-pulse rounded-full bg-gray-100" />
          </div>

          <div className="space-y-2">
            {[1, 2].map((item) => (
              <div key={item} className="flex gap-3 rounded-xl border border-gray-100 px-3 py-3">
                <div className="h-7 w-7 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--rsc-brand)_10%,white)]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded-full bg-gray-200" />
                  <div className="h-3 w-28 animate-pulse rounded-full bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function KitchenBreakdown({
  subOrders,
  lineItems,
}: {
  subOrders: SubOrderDetail[];
  lineItems: OrderLineItem[];
}) {
  const { data: outlets, isPending: outletsPending } = useOutlets();
  const outletNames = new Map(outlets?.map((outlet) => [outlet.id, outlet.name]) ?? []);

  if (subOrders.length === 0) {
    return (
      <Card>
        <p className="text-sm text-gray-500">Kitchen details are not available yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--rsc-main)_10%,white)] text-[var(--rsc-main)]">
            <Store className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-gray-900">Outlet breakdown</p>
            <p className="text-xs text-gray-500">Track each outlet separately</p>
          </div>
        </div>
        <span className="rounded-full bg-[color-mix(in_srgb,var(--rsc-brand)_12%,white)] px-2.5 py-1 text-xs font-semibold text-[var(--rsc-brand-strong)]">
          {subOrders.length} {subOrders.length === 1 ? "outlet" : "outlets"}
        </span>
      </div>

      {subOrders.map((subOrder) => {
        const items = lineItems.filter((lineItem) => lineItem.subOrderId === subOrder.id);
        const normalizedStatus = subOrder.status.toUpperCase();
        const unavailable = normalizedStatus === "REJECTED" || normalizedStatus === "CANCELLED";
        const preparationTimeMinutes =
          typeof subOrder.preparationTime === "number" && !Number.isNaN(subOrder.preparationTime)
            ? subOrder.preparationTime
            : null;
        const shouldShowPreparationTime =
          preparationTimeMinutes !== null && !unavailable && normalizedStatus !== "READY";

        return (
          <Card
            key={subOrder.id}
            className={
              unavailable
                ? "overflow-hidden border-red-200 bg-red-50/40 shadow-[0_12px_30px_rgba(163,58,43,0.08)]"
                : "overflow-hidden border-[color:color-mix(in_srgb,var(--rsc-main)_12%,white)] bg-[linear-gradient(145deg,white_0%,color-mix(in_srgb,var(--rsc-main)_3%,white)_100%)] shadow-[0_12px_30px_rgba(30,49,96,0.08)]"
            }
          >
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: "color-mix(in srgb, var(--rsc-main) 10%, white)",
                    color: "var(--rsc-main)",
                  }}
                >
                  <Store className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {outletNames.get(subOrder.outletId) ??
                      (outletsPending ? "Loading outlet…" : "Outlet unavailable")}
                  </p>
                  <p className="text-xs text-gray-400">#{subOrder.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: unavailable
                    ? "#fee2e2"
                    : normalizedStatus === "READY"
                      ? "color-mix(in srgb, var(--rsc-main) 12%, white)"
                      : "color-mix(in srgb, var(--rsc-brand) 12%, white)",
                  color: unavailable
                    ? "var(--rsc-danger)"
                    : normalizedStatus === "READY"
                      ? "var(--rsc-main)"
                      : "var(--rsc-brand)",
                }}
              >
                {SUB_ORDER_LABELS[normalizedStatus] ??
                  normalizedStatus.toLowerCase().replaceAll("_", " ")}
              </span>
            </div>

            {shouldShowPreparationTime && (
              <div className="mb-4 rounded-xl border border-[color:color-mix(in_srgb,var(--rsc-brand)_18%,white)] bg-[color:color-mix(in_srgb,var(--rsc-brand)_8%,white)] px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--rsc-brand-strong)]">
                  Estimated preparation time
                </p>
                <p className="mt-0.5 text-sm font-bold text-gray-800">
                  {preparationTimeMinutes} minutes
                </p>
              </div>
            )}

            {items.length > 0 ? (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex gap-3 rounded-xl border border-gray-100 bg-white/90 px-3 py-3 shadow-[0_3px_10px_rgba(30,49,96,0.04)]"
                  >
                    <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--rsc-brand)_12%,white)] px-1.5 text-xs font-bold text-[var(--rsc-brand-strong)]">
                      {item.quantity}×
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800">{item.itemNameSnapshot}</p>
                      {item.modifiersSnapshot.length > 0 && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {item.modifiersSnapshot.map((modifier) => modifier.name).join(", ")}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                Item details are not available for this kitchen.
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function RiderMapState({
  orderId,
  customerLatLng,
}: {
  orderId: string;
  customerLatLng: [number, number] | null;
}) {
  const { location, connection, isLoading, isUnavailable } = useRiderTracking(orderId, true);

  if (isLoading && !location) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-500">
        Locating your rider…
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-xl bg-gray-50 px-6 text-center">
        <Bike className="mb-2 h-6 w-6 text-gray-400" aria-hidden="true" />
        <p className="text-sm font-semibold text-gray-700">Rider location is not available yet</p>
        <p className="mt-1 text-xs text-gray-500">
          {isUnavailable
            ? "We could not load the latest location. Updates will retry automatically."
            : "The map will appear as soon as the rider shares a location."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
      <TrackingMap riderLocation={location} customerLatLng={customerLatLng} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-white px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--rsc-brand)]" />
          Rider
        </span>
        {customerLatLng && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--rsc-main)]" />
            Your location
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-xs text-gray-500">
          {connection === "live" ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
              Live
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              Updating periodically
            </>
          )}
        </span>
      </div>
    </div>
  );
}

function OrderTrackingDetail({ orderId }: { orderId: string }) {
  const { data: detail, isPending, isError, isFetching, refetch } = useOrderDetail(orderId);

  if (isPending) {
    return (
      <div className="space-y-3 py-2" aria-label="Loading order details">
        <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-36 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="rounded-xl bg-red-50 p-5 text-center">
        <p className="text-sm font-semibold text-red-700">We could not load this order</p>
        <p className="mt-1 text-xs text-red-600">Check your connection and try again.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700"
        >
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  const { order, events, subOrders, lineItems } = detail;
  const normalizedStatus = order.status.toUpperCase();
  const isOutForDelivery = normalizedStatus === "OUT_FOR_DELIVERY";
  const customerLatLng: [number, number] | null =
    order.deliveryLatitude !== null && order.deliveryLongitude !== null
      ? [order.deliveryLatitude, order.deliveryLongitude]
      : null;

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden border-transparent border-t-4 border-t-[var(--rsc-brand)] bg-[linear-gradient(135deg,var(--rsc-main)_0%,var(--rsc-navy-light)_100%)] shadow-[0_18px_45px_rgba(30,49,96,0.22)]">
        {isFetching && (
          <span className="absolute right-4 top-4 text-xs font-medium text-white/60">
            Updating…
          </span>
        )}
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
          Current status
        </p>
        <p className="mt-2 text-xl font-bold text-white">{getStatusConfig(order.status).label}</p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
          {MASTER_STATUS_MESSAGES[normalizedStatus] ?? "Your order status has been updated."}
        </p>
      </Card>

      {isOutForDelivery && order.deliveryMode === "DELIVERY" && (
        <>
          {order.riderId ? (
            <RiderMapState orderId={order.id} customerLatLng={customerLatLng} />
          ) : (
            <Card className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--rsc-brand)_10%,white)] text-[var(--rsc-brand)]">
                <Bike className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Assigning your rider</p>
                <p className="text-xs text-gray-500">
                  Live map tracking will begin after rider assignment.
                </p>
              </div>
            </Card>
          )}
        </>
      )}

      <KitchenBreakdown subOrders={subOrders} lineItems={lineItems} />

      <Card className="space-y-4 border-[color:color-mix(in_srgb,var(--rsc-main)_10%,white)] shadow-[0_12px_32px_rgba(30,49,96,0.07)]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--rsc-main)_9%,white)] text-[var(--rsc-main)]">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-bold text-gray-900">
            {order.deliveryMode === "TAKEOUT" ? "Collection details" : "Delivery details"}
          </p>
        </div>
        {order.deliveryAddress && (
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-gray-700">{order.deliveryAddress}</p>
          </div>
        )}
        {order.deliveryMode === "TAKEOUT" && (
          <p className="text-sm text-gray-600">Collect each prepared order at its outlet.</p>
        )}
      </Card>

      <Card className="border-[color:color-mix(in_srgb,var(--rsc-main)_10%,white)] shadow-[0_12px_32px_rgba(30,49,96,0.07)]">
        <OrderTimeline
          events={events}
          riderAssigned={order.riderId !== null}
          currentStatus={order.status}
          deliveryMode={order.deliveryMode}
        />
      </Card>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

interface AccordionItemProps {
  order: Order;
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionOrderItem({ order, isOpen, onToggle }: AccordionItemProps) {
  const status = getStatusConfig(order.status);
  const contentId = `tracking-order-${order.id}`;
  const normalizedStatus = order.status.toUpperCase();
  const codeVisibleStatuses = new Set([
    "CONFIRMED",
    "PREPARING",
    "PARTIALLY_READY",
    "PARTIALLY_FULFILLED",
    "READY",
    "OUT_FOR_DELIVERY",
  ]);
  const showHandoffCode = !!order.deliveryCode && codeVisibleStatuses.has(normalizedStatus);
  const isReadyForPickup = normalizedStatus === "READY";
  const headerToneClass = isReadyForPickup
    ? isOpen
      ? "border-l-[var(--rsc-success)] bg-[color-mix(in_srgb,var(--rsc-success)_14%,white)]"
      : "border-l-[var(--rsc-success)] bg-[color-mix(in_srgb,var(--rsc-success)_8%,white)] hover:bg-[color-mix(in_srgb,var(--rsc-success)_12%,white)]"
    : isOpen
      ? "border-l-[var(--rsc-brand)] bg-[color-mix(in_srgb,var(--rsc-main)_4%,white)]"
      : "border-l-transparent hover:bg-gray-50";
  const toggleToneClass = isReadyForPickup
    ? "bg-[var(--rsc-success)] text-white"
    : isOpen
      ? "bg-[var(--rsc-main)] text-white"
      : "bg-gray-100 text-gray-500";

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white transition-all duration-200 ${
        isOpen
          ? "border-[color:color-mix(in_srgb,var(--rsc-main)_22%,white)] shadow-[0_18px_50px_rgba(30,49,96,0.13)]"
          : "border-gray-200 shadow-[0_6px_20px_rgba(30,49,96,0.06)] hover:border-[color:color-mix(in_srgb,var(--rsc-main)_16%,white)] hover:shadow-[0_12px_30px_rgba(30,49,96,0.10)]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className={`flex w-full items-center gap-3 border-l-4 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rsc-main)] ${headerToneClass}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: status.bg, color: status.color }}
            >
              {status.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {formatNaira(order.totalMinor)} ·{" "}
            {order.deliveryMode === "DELIVERY" ? "Delivery" : "Takeout"} ·{" "}
            {formatDate(order.createdAt)}
          </p>
          {showHandoffCode && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[color:color-mix(in_srgb,var(--rsc-brand)_22%,white)] bg-[color-mix(in_srgb,var(--rsc-brand)_10%,white)] px-2.5 py-1.5">
              <span className="text-xs font-semibold text-gray-600">
                {order.deliveryMode === "DELIVERY" ? "Delivery code" : "Pickup code"}
              </span>
              <span className="font-mono text-sm font-bold tracking-wider text-[var(--rsc-main)]">
                {order.deliveryCode}
              </span>
            </div>
          )}
        </div>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${toggleToneClass}`}
        >
          <ChevronDown
            className="h-5 w-5 transition-transform duration-200"
            style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            aria-hidden="true"
          />
        </span>
      </button>

      {isOpen && (
        <div
          id={contentId}
          className="border-t border-gray-100 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--rsc-main)_2%,white)_0%,white_34%)] px-4 pb-5 pt-5"
        >
          <OrderTrackingDetail orderId={order.id} />
        </div>
      )}
    </div>
  );
}

export function TrackingView({
  orderId,
  paymentReference,
}: {
  orderId: string | null;
  paymentReference: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearCart = useCartStore((state) => state.clear);
  const { data: activeOrders, isPending, isError, refetch } = useActiveOrders();
  const [expandedId, setExpandedId] = useState<string | null | undefined>(orderId ?? undefined);
  const paymentResultHandledRef = useRef(false);
  const paymentVerification = useQuery({
    queryKey: ["payment", "verify", paymentReference],
    queryFn: async () => {
      const result = await apiClient.verifyPayment(paymentReference!);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      return result;
    },
    enabled: !!paymentReference,
    retry: 2,
    refetchOnWindowFocus: false,
  });
  const paymentResultStatus =
    paymentVerification.data?.status === "SUCCESS" || paymentVerification.data?.status === "FAILED"
      ? paymentVerification.data.status
      : null;

  useEffect(() => {
    const status = paymentVerification.data?.status;

    if (
      !paymentReference ||
      paymentResultHandledRef.current ||
      (status !== "SUCCESS" && status !== "FAILED")
    ) {
      return;
    }

    paymentResultHandledRef.current = true;

    if (status === "SUCCESS") {
      clearCart();
    }

    const timeoutId = window.setTimeout(() => {
      if (status === "SUCCESS") {
        router.replace("/tracking");
        return;
      }

      router.replace("/cart");
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [clearCart, paymentReference, paymentVerification.data?.status, router]);

  if (paymentResultStatus) {
    return <PaymentResultModal status={paymentResultStatus} />;
  }

  if (isPending) {
    return <TrackingPageSkeleton />;
  }

  if (isError) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm font-semibold text-gray-800">We could not load your active orders.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--rsc-main)]"
        >
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  if (!activeOrders || activeOrders.length === 0) {
    return <NoActiveOrder />;
  }

  const requestedOrderExists = activeOrders.some(
    (order) => (order.customerViewId ?? order.id) === expandedId,
  );
  const visibleExpandedId =
    expandedId === undefined || (expandedId !== null && !requestedOrderExists)
      ? (activeOrders[0]!.customerViewId ?? activeOrders[0]!.id)
      : expandedId;

  return (
    <div className="space-y-3">
      {paymentReference && (
        <Card className="border-[color:color-mix(in_srgb,var(--rsc-main)_16%,white)] bg-[color-mix(in_srgb,var(--rsc-main)_4%,white)]">
          <p className="text-sm font-semibold text-gray-900">
            {paymentVerification.isPending
              ? "Confirming your payment..."
              : paymentVerification.isError
                ? "Payment received. We are still syncing your order status."
                : paymentVerification.data.status === "SUCCESS"
                  ? "Payment confirmed. Your order is now being tracked."
                  : "Payment status updated. Your order will refresh shortly."}
          </p>
        </Card>
      )}
      {activeOrders.length > 1 && (
        <p className="text-sm text-gray-500">
          You have {activeOrders.length} active orders. Open one to see its live progress.
        </p>
      )}
      {activeOrders.map((order) => (
        <AccordionOrderItem
          key={order.customerViewId ?? order.id}
          order={order}
          isOpen={visibleExpandedId === (order.customerViewId ?? order.id)}
          onToggle={() =>
            setExpandedId((previous) =>
              previous === (order.customerViewId ?? order.id) ||
              visibleExpandedId === (order.customerViewId ?? order.id)
                ? null
                : (order.customerViewId ?? order.id),
            )
          }
        />
      ))}
    </div>
  );
}
