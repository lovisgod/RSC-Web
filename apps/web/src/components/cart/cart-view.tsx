"use client";

import { EmptyState } from "@rsc/ui";
import Link from "next/link";

import { useCart } from "@/src/hooks/use-cart";
import { CartOutletGroupCard } from "@/src/components/cart/cart-outlet-group";
import { CartTotals } from "@/src/components/cart/cart-totals";

export function CartView() {
  const { data: cart, isPending, isError } = useCart();

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading your cart…
      </div>
    );
  }

  if (isError || !cart) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500 text-sm">
        Could not load your cart. Please refresh.
      </div>
    );
  }

  if (cart.groups.length === 0) {
    return (
      <EmptyState
        icon={
          <img
            src="/icons/png/shopping-cart_1f6d2.png"
            alt="Cart"
            className="w-12 h-12 object-contain"
          />
        }
        heading="Your cart is empty"
        body="Browse kitchens and add something delicious."
        action={
          <Link
            href="/outlets"
            className="text-sm font-semibold hover:underline"
            style={{ color: "var(--rsc-dark)" }}
          >
            Browse kitchens
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <div className="flex-1 space-y-4">
        {cart.groups.map((group) => (
          <CartOutletGroupCard key={group.outletId} group={group} />
        ))}
      </div>
      <div className="w-full lg:w-[380px] lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] flex flex-col">
        <CartTotals cart={cart} />
      </div>
    </div>
  );
}
