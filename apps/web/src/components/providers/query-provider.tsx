"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { ApiError } from "@rsc/api-client";

import { useAuthStore } from "@/src/stores/auth-store";
import { useCartStore } from "@/src/stores/cart-store";
import { CartSessionBridge } from "@/src/components/providers/cart-session-bridge";
import { OutletRealtimeBridge } from "@/src/components/providers/outlet-realtime-bridge";
import { isPublicWebRoute } from "@/src/lib/public-routes";

function handleGlobalError(error: unknown) {
  if (
    error instanceof ApiError &&
    error.status === 401 &&
    error.message === "Authentication required"
  ) {
    useCartStore.getState().releaseActiveSessionOwner();
    useAuthStore.getState().signOut();
    if (isPublicWebRoute(window.location.pathname)) return;
    window.location.replace("/sign-in");
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: handleGlobalError }),
        mutationCache: new MutationCache({ onError: handleGlobalError }),
        defaultOptions: {
          queries: {
            staleTime: 0,
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status === 401) return false;
              return failureCount < 1;
            },
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <CartSessionBridge />
      <OutletRealtimeBridge />
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
