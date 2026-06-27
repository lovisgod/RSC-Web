"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/src/stores/auth-store";

export function UnauthGuard({ children }: { children: ReactNode }) {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/outlets");
    }
  }, [isSignedIn, router]);

  // Prevent flash of unauth content after Zustand rehydrates
  if (isSignedIn) return null;

  return <>{children}</>;
}
