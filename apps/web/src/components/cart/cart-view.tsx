"use client";

import { EmptyState } from "@rsc/ui";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/src/hooks/use-cart";
import { CartOutletGroupCard } from "@/src/components/cart/cart-outlet-group";
import { CartTotals } from "@/src/components/cart/cart-totals";
import { useCartStore } from "@/src/stores/cart-store";

export function CartView() {
  const { data: cart, isPending, isError } = useCart();
  const clearCart = useCartStore((state) => state.clear);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

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
            style={{ color: "var(--rsc-brand)" }}
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
          onClick={() => setConfirmClearOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-500 transition hover:border-red-200 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
          aria-label="Clear cart"
          title="Clear cart"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      {confirmClearOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-cart-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
                  Clear cart
                </p>
                <h2 id="clear-cart-title" className="mt-2 text-xl font-bold text-gray-900">
                  Remove all items?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200"
                aria-label="Close clear cart confirmation"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              This will remove every item currently in your cart. You can always add them again from
              the outlets page.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Keep cart
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  setConfirmClearOpen(false);
                }}
                className="rounded-full px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "var(--rsc-danger)" }}
              >
                Clear cart
              </button>
            </div>
          </div>
        </div>
      )}

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
