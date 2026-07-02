"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/src/stores/auth-store";

export function UnauthGuard({ children }: { children: ReactNode }) {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    if (isSignedIn) router.replace("/outlets");
  }, [isSignedIn, hasHydrated, router]);

  if (!hasHydrated || isSignedIn) return null;

  return <>{children}</>;
}
