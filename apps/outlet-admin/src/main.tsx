import "@rsc/ui/styles.css";
import "./styles.css";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./app";
import { registerOutletServiceWorker } from "./lib/register-service-worker";
import { toastBus } from "./lib/toast-bus";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: Error) => {
      toastBus.emit(error.message, "error");
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const container = document.getElementById("root");

if (!container) {
  throw new Error("Missing #root container");
}

registerOutletServiceWorker();

document.documentElement.dataset.theme = "light";
document.documentElement.style.colorScheme = "light";

createRoot(container, {
  onRecoverableError(error, errorInfo) {
    console.error("Recoverable render error", error, errorInfo.componentStack);
  },
}).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
