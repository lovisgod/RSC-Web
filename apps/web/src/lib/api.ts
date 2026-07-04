import { createApiClient } from "@rsc/api-client";

import { useAuthStore } from "@/src/stores/auth-store";

// In the browser, all /api/v1/* requests go through the Next.js rewrite proxy
// (same origin → cookies are forwarded automatically).
// In server-side contexts, fall back to the direct API URL.
const baseUrl =
  typeof window !== "undefined"
    ? "" // same-origin proxy handles /api/v1/*
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000");

const PUBLIC_AUTH_ENDPOINTS = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/verify-user",
  "/api/v1/auth/resend-verification-code",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
];

let isRedirectingToSignIn = false;

function handleUnauthorized(path: string) {
  if (
    typeof window === "undefined" ||
    isRedirectingToSignIn ||
    window.location.pathname === "/sign-in" ||
    PUBLIC_AUTH_ENDPOINTS.some((endpoint) => path.startsWith(endpoint))
  ) {
    return;
  }

  isRedirectingToSignIn = true;
  window.sessionStorage.removeItem("rsc-auth-session");
  window.location.replace("/sign-in");
}

function handleServerError() {
  if (
    typeof window === "undefined" ||
    isRedirectingToSignIn ||
    window.location.pathname === "/sign-in" ||
    !useAuthStore.getState().isSignedIn
  ) {
    return;
  }

  isRedirectingToSignIn = true;
  useAuthStore.getState().signOut();
  window.location.replace("/sign-in");
}

export const apiClient = createApiClient({
  baseUrl,
  onUnauthorized: handleUnauthorized,
  onServerError: handleServerError,
});
