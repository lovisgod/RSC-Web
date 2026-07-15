import type { Metadata } from "next";

import { AuthGuard } from "@/src/components/auth/auth-guard";
import { CheckoutView } from "@/src/components/checkout/checkout-view";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <CheckoutView />
      </div>
    </AuthGuard>
  );
}
