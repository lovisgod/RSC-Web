import { createApiClient } from "@rsc/api-client";

export const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
});
