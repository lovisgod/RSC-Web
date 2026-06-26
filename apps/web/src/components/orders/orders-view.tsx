"use client";

import { Button, EmptyState } from "@rsc/ui";
import { useState } from "react";

import { useActiveOrder } from "@/src/hooks/use-orders";
import { useCompletedOrders } from "@/src/hooks/use-orders";
import { OrderCard } from "@/src/components/orders/order-card";

type Tab = "active" | "completed";

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
    <Button tone={active ? "navy" : "quiet"} type="button" onClick={onClick}>
      {label}
    </Button>
  );
}

function ActiveTab() {
  const { data: order, isPending, isError } = useActiveOrder();

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

  if (!order) {
    return (
      <EmptyState
        icon="🍽️"
        heading="You do not have an active order"
        body="Browse our kitchens and place your first order today."
      />
    );
  }

  return (
    <div className="space-y-4">
      <OrderCard order={order} variant="active" />
    </div>
  );
}

function CompletedTab() {
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
        <OrderCard key={order.id} order={order} variant="completed" />
      ))}
    </div>
  );
}

export function OrdersView() {
  const [tab, setTab] = useState<Tab>("active");

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <TabButton label="Active" active={tab === "active"} onClick={() => setTab("active")} />
        <TabButton
          label="Completed"
          active={tab === "completed"}
          onClick={() => setTab("completed")}
        />
      </div>
      {tab === "active" ? <ActiveTab /> : <CompletedTab />}
    </div>
  );
}
