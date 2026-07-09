"use client";

import { EmptyState } from "@rsc/ui";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/src/hooks/use-cart";
import { CartOutletGroupCard } from "@/src/components/cart/cart-outlet-group";
import { CartTotals } from "@/src/components/cart/cart-totals";
import { useCartStore } from "@/src/stores/cart-store";

export function CartView() {
  const { data: cart, isPending, isError } = useCart();
  const clearCart = useCartStore((state) => state.clear);

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
          <Image
            src="/icons/png/shopping-cart_1f6d2.png"
            alt="Cart"
            width={48}
            height={48}
            className="object-contain"
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={clearCart}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-500 transition hover:border-red-200 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
          aria-label="Clear cart"
          title="Clear cart"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
        <div className="w-full flex-1 space-y-4">
          {cart.groups.map((group) => (
            <CartOutletGroupCard key={group.outletId} group={group} />
          ))}
        </div>
        <div className="w-full lg:w-[380px] lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] flex flex-col">
          <CartTotals cart={cart} />
        </div>
      </div>
    </div>
  );
}
