"use client";

import { EmptyState } from "@rsc/ui";
import { useState } from "react";

import { OrderCard, OrderDetailsModal } from "@/src/components/orders/order-card";
import {
  useCancelledOrders,
  useCompletedOrders,
  useProfileActiveOrders,
} from "@/src/hooks/use-orders";
import type { Order } from "@/src/lib/data/orders";

type Tab = "active" | "completed" | "cancelled";

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`border-b-2 px-1 pb-2 text-sm font-semibold transition-colors ${
        active
          ? "border-[var(--rsc-main)] text-[var(--rsc-navy)]"
          : "border-transparent text-gray-400 hover:text-[var(--rsc-navy)]"
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ActiveTab({ onViewDetails }: { onViewDetails: (order: Order) => void }) {
  const { data: orders, isPending, isError } = useProfileActiveOrders();

  if (isPending) {
    return <p className="text-sm text-gray-400 py-8 text-center">Checking for active orders…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-500 py-8 text-center">
        Could not load orders. Please refresh.
      </p>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <EmptyState
        icon="🍽️"
        heading="You do not have an active order"
        body="Browse our kitchens and place your first order today."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {orders.map((order) => (
        <OrderCard
          key={order.customerViewId ?? order.id}
          order={order}
          variant="active"
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}

function CompletedTab({ onViewDetails }: { onViewDetails: (order: Order) => void }) {
  const { data: orders, isPending, isError } = useCompletedOrders();

  if (isPending) {
    return <p className="text-sm text-gray-400 py-8 text-center">Loading past orders…</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-500 py-8 text-center">
        Could not load orders. Please refresh.
      </p>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <EmptyState
        icon="📋"
        heading="No completed orders yet"
        body="Your order history will appear here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {orders.map((order) => (
        <OrderCard
          key={order.customerViewId ?? order.id}
          order={order}
          variant="completed"
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}

function CancelledTab({ onViewDetails }: { onViewDetails: (order: Order) => void }) {
  const { data: orders, isPending, isError } = useCancelledOrders();

  if (isPending) {
    return <p className="py-8 text-center text-sm text-gray-400">Loading cancelled orders…</p>;
  }

  if (isError) {
    return (
      <p className="py-8 text-center text-sm text-red-500">
        Could not load orders. Please refresh.
      </p>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <EmptyState
        icon="📋"
        heading="No cancelled orders"
        body="Cancelled orders will appear here if any order is stopped."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {orders.map((order) => (
        <OrderCard
          key={order.customerViewId ?? order.id}
          order={order}
          variant="cancelled"
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}

interface OrdersViewProps {
  onViewDetails?: (order: Order) => void;
}

export function OrdersView({ onViewDetails }: OrdersViewProps = {}) {
  const [tab, setTab] = useState<Tab>("active");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const handleViewDetails = onViewDetails ?? setSelectedOrder;

  return (
    <div className="relative space-y-6">
      <div className="flex gap-6">
        <TabButton
          label="Active"
          active={tab === "active"}
          onClick={() => {
            setTab("active");
            setSelectedOrder(null);
          }}
        />
        <TabButton
          label="Completed"
          active={tab === "completed"}
          onClick={() => {
            setTab("completed");
            setSelectedOrder(null);
          }}
        />
        <TabButton
          label="Cancelled"
          active={tab === "cancelled"}
          onClick={() => {
            setTab("cancelled");
            setSelectedOrder(null);
          }}
        />
      </div>
      {!onViewDetails && selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
      {tab === "active" && <ActiveTab onViewDetails={handleViewDetails} />}
      {tab === "completed" && <CompletedTab onViewDetails={handleViewDetails} />}
      {tab === "cancelled" && <CancelledTab onViewDetails={handleViewDetails} />}
    </div>
  );
}
