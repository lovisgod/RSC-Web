import { PageHeader } from "@rsc/ui";
import type { Metadata } from "next";

import { CartView } from "@/src/components/cart/cart-view";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <PageHeader
        title="Your cart"
        subtitle="Review items grouped by kitchen before choosing delivery or pickup."
      />
      <CartView />
    </div>
  );
}
