import { PageHeader } from "@rsc/ui";
import type { Metadata } from "next";

import { OrdersView } from "@/src/components/orders/orders-view";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <PageHeader title="Orders" subtitle="Track active deliveries or browse your order history." />
      <OrdersView />
    </div>
  );
}
