import { createApiClient } from "@rsc/api-client";

// In the browser, all /api/v1/* requests go through the Next.js rewrite proxy
// (same origin → cookies are forwarded automatically).
// In server-side contexts, fall back to the direct API URL.
const baseUrl =
  typeof window !== "undefined"
    ? "" // same-origin proxy handles /api/v1/*
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000");

export const apiClient = createApiClient({ baseUrl });
