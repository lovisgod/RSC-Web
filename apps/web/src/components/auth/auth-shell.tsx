"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { List } from "lucide-react";

import { useAuthStore } from "@/src/stores/auth-store";
import { useCartStore } from "@/src/stores/cart-store";
import { SideNav, SideNavDrawer } from "@/src/components/signed-in/side-nav";
import { BottomNav } from "@/src/components/signed-in/bottom-nav";
import { ThemeToggle } from "@rsc/ui";

export function AuthShell({ children }: { children: ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const userId = useAuthStore((s) => s.userId);
  const reconcileCartOwner = useCartStore((s) => s.reconcileOwner);
  const pathname = usePathname();

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    reconcileCartOwner(userId);
  }, [reconcileCartOwner, isSignedIn, userId]);

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
    <div className="flex h-screen overflow-hidden bg-[var(--rsc-page-background)] relative">
      <SideNav />
      {/* Mobile SideNav Drawer */}
      <SideNavDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Floating Menu Button for Mobile Screens */}
      <button
        type="button"
        onClick={() => setIsDrawerOpen(true)}
        aria-label="Open navigation menu"
        className="fixed top-3 left-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md border border-gray-200 text-gray-700 transition hover:bg-white hover:text-black dark:bg-gray-900/90 dark:border-gray-800 dark:text-gray-200 md:hidden"
      >
        <List className="w-5 h-5" />
      </button>

      {/* Floating Theme Toggle for Mobile Screens */}
      <div className="fixed top-3 right-3 z-30 md:hidden">
        <ThemeToggle className="shadow-md rounded-full bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-800" />
      </div>
      <main className="h-screen flex-1 overflow-x-hidden overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
