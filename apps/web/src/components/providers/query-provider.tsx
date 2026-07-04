"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { ApiError } from "@rsc/api-client";

import { useAuthStore } from "@/src/stores/auth-store";

function handleGlobalError(error: unknown) {
  if (
    error instanceof ApiError &&
    error.status === 401 &&
    error.message === "Authentication required"
  ) {
    useAuthStore.getState().signOut();
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
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
