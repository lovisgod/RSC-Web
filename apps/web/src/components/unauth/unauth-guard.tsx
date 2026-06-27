"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/src/stores/auth-store";

export function UnauthGuard({ children }: { children: ReactNode }) {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (isSignedIn) {
      router.replace("/outlets");
    }
  }, [hydrated, isSignedIn, router]);

  if (!hydrated || isSignedIn) return null;

  return <>{children}</>;
}
