"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { useAuthStore } from "@/src/stores/auth-store";
import { useCartStore } from "@/src/stores/cart-store";
import { SideNav } from "@/src/components/signed-in/side-nav";
import { BottomNav } from "@/src/components/signed-in/bottom-nav";

export function AuthShell({ children }: { children: ReactNode }) {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const userId = useAuthStore((s) => s.userId);
  const claimCartOwner = useCartStore((s) => s.claimActiveSessionOwner);
  const pathname = usePathname();

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    claimCartOwner(userId);
  }, [claimCartOwner, isSignedIn, userId]);

  // Push a duplicate history entry on every route change so back swipe
  // lands on the same URL rather than escaping to unauthenticated pages.
  useEffect(() => {
    if (!isSignedIn) return;
    window.history.pushState(null, "", window.location.href);
  }, [pathname, isSignedIn]);

  // Re-push on every popstate (back/forward gesture) to block it entirely.
  useEffect(() => {
    if (!isSignedIn) return;

    function handlePopState() {
      window.history.pushState(null, "", window.location.href);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isSignedIn]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--rsc-page-background)]">
      <SideNav />
      <main className="h-screen flex-1 overflow-x-hidden overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
