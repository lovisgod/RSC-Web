"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Card, EmptyState } from "@rsc/ui";
import { ChevronDown } from "lucide-react";

import { useActiveOrders } from "@/src/hooks/use-orders";
import { useOrderDetail, useRiderLocationStream } from "@/src/hooks/use-order-tracking";
import { formatNaira } from "@/src/lib/data/cart";
import { getStatusConfig, type Order } from "@/src/lib/data/orders";
import { OrderTimeline } from "./order-timeline";

const TrackingMap = dynamic(() => import("./tracking-map"), { ssr: false });

// ── Empty state ───────────────────────────────────────────────────────────────

function NoActiveOrder() {
  return (
    <EmptyState
      icon={
        <Image
          src="/icons/png/round-pushpin_1f4cd.png"
          alt="Tracking"
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
          style={{ color: "var(--rsc-dark)" }}
        >
          Browse kitchens
        </Link>
      }
    />
  );
}

// ── Order tracking detail (rendered only when accordion is open) ──────────────

function OrderTrackingDetail({ orderId }: { orderId: string }) {
  const { data: detail, isPending, isError } = useOrderDetail(orderId);

  const isOutForDelivery = detail?.order.status.toUpperCase() === "OUT_FOR_DELIVERY";
  const streamedLocation = useRiderLocationStream(orderId, !!isOutForDelivery);

  if (isPending) {
    return <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>;
  }

  if (isError || !detail) {
    return (
      <p className="text-sm text-red-500 py-6 text-center">
        Could not load order details. Please refresh.
      </p>
    );
  }

  const { order, events, latestRiderLocation } = detail;
  const displayRiderLocation = streamedLocation ?? latestRiderLocation;

  const customerLatLng: [number, number] | null =
    order.deliveryLatitude !== null && order.deliveryLongitude !== null
      ? [order.deliveryLatitude, order.deliveryLongitude]
      : null;

  return (
    <div className="space-y-4">
      {/* Live map — only when rider is on the way */}
      {isOutForDelivery && displayRiderLocation && (
        <div className="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
          <TrackingMap riderLocation={displayRiderLocation} customerLatLng={customerLatLng} />
          <div className="flex items-center gap-2 px-3 py-2 bg-white">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400 flex-shrink-0" />
            <span className="text-xs text-gray-500">Rider</span>
            {customerLatLng && (
              <>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 ml-3" />
                <span className="text-xs text-gray-500">Your location</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delivery details */}
      <Card className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Delivery details
        </p>
        {order.deliveryCode && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Delivery code</span>
            <span className="font-mono font-bold text-gray-900">{order.deliveryCode}</span>
          </div>
        )}
        {order.deliveryAddress && (
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm text-gray-600 flex-shrink-0">Address</span>
            <span className="text-sm text-gray-900 text-right leading-snug">
              {order.deliveryAddress}
            </span>
          </div>
        )}
        {order.deliveryMode === "TAKEOUT" && (
          <p className="text-sm text-gray-600">Takeout — collect at the outlet</p>
        )}
      </Card>

      {/* Progress timeline */}
      <Card>
        <OrderTimeline
          events={events}
          riderAssigned={order.riderId !== null}
          currentStatus={order.status}
        />
      </Card>
    </div>
  );
}

// ── Accordion item ────────────────────────────────────────────────────────────

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

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
      {/* Header row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
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
          <p className="text-xs text-gray-400 mt-0.5">
            {formatNaira(order.totalMinor)} ·{" "}
            {order.deliveryMode === "DELIVERY" ? "Delivery" : "Takeout"} ·{" "}
            {formatDate(order.createdAt)}
          </p>
        </div>
        <ChevronDown
          className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* Collapsible body */}
      {isOpen && (
        <div className="border-t border-gray-100 px-4 pt-4 pb-4">
          <OrderTrackingDetail orderId={order.id} />
        </div>
      )}
    </div>
  );
}

// ── Root view ─────────────────────────────────────────────────────────────────

export function TrackingView({ orderId }: { orderId: string | null }) {
  const { data: activeOrders, isPending } = useActiveOrders();

  // Pre-expand: URL param first, then default to first active order
  const [expandedId, setExpandedId] = useState<string | null | undefined>(orderId ?? undefined);

  if (isPending) {
    return <p className="text-sm text-gray-400 py-8 text-center">Checking for active orders…</p>;
  }

  if (!activeOrders || activeOrders.length === 0) {
    return <NoActiveOrder />;
  }

  const visibleExpandedId = expandedId === undefined ? activeOrders[0]!.id : expandedId;

  return (
    <div className="space-y-3">
      {activeOrders.map((order) => (
        <AccordionOrderItem
          key={order.id}
          order={order}
          isOpen={visibleExpandedId === order.id}
          onToggle={() => setExpandedId((prev) => (prev === order.id ? null : order.id))}
        />
      ))}
    </div>
  );
}
