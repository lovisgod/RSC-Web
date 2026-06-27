"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStore } from "@/src/stores/auth-store";

export const AUTH_REDIRECT_KEY = "rsc-auth-redirect";

export function AuthGuard({ children }: { children: ReactNode }) {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  // Wait one tick for Zustand to rehydrate from sessionStorage before checking
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isSignedIn) {
      localStorage.setItem(AUTH_REDIRECT_KEY, pathname);
      router.replace("/sign-in");
    }
  }, [hydrated, isSignedIn, pathname, router]);

  // Render nothing until hydrated and confirmed signed-in
  if (!hydrated || !isSignedIn) return null;

  return <>{children}</>;
}
