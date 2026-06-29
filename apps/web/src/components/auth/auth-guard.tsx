"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStore } from "@/src/stores/auth-store";

export const AUTH_REDIRECT_KEY = "rsc-auth-redirect";

export function AuthGuard({ children }: { children: ReactNode }) {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isSignedIn) {
      localStorage.setItem(AUTH_REDIRECT_KEY, pathname);
      router.replace("/sign-in");
    }
  }, [isSignedIn, hasHydrated, pathname, router]);

  if (!hasHydrated || !isSignedIn) return null;

  return <>{children}</>;
}
