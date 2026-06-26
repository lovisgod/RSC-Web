"use client";

import type { ReactNode } from "react";

import { useAuthStore } from "@/src/stores/auth-store";
import { AppHeader } from "@/src/components/auth/app-header";
import { SideNav } from "@/src/components/signed-in/side-nav";
import { BottomNav } from "@/src/components/signed-in/bottom-nav";

export function AuthShell({ children }: { children: ReactNode }) {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);

  if (isSignedIn) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        {/* Desktop side nav */}
        <SideNav />

        {/* Page content — pb-20 reserves space for the mobile bottom nav */}
        <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <AppHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
