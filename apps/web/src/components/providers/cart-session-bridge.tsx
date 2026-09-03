"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/src/stores/auth-store";
import { useCartStore } from "@/src/stores/cart-store";

export function CartSessionBridge() {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const userId = useAuthStore((state) => state.userId);
  const reconcileCartOwner = useCartStore((state) => state.reconcileOwner);
  const releaseCartOwner = useCartStore((state) => state.releaseActiveSessionOwner);

  useEffect(() => {
    if (!hasHydrated) return;

    if (isSignedIn && userId) {
      reconcileCartOwner(userId);
      return;
    }

    releaseCartOwner();
  }, [claimCartOwner, hasHydrated, isSignedIn, releaseCartOwner, userId]);

  return null;
}
