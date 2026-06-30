import { createApiClient } from "@rsc/api-client";

const accessTokenStorageKey = "rsc.outlet-admin.access-token";

export function setAccessToken(token: string | null) {
  if (token) {
    localStorage.setItem(accessTokenStorageKey, token);
    return;
  }

  localStorage.removeItem(accessTokenStorageKey);
}

export const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  getAccessToken: () => localStorage.getItem(accessTokenStorageKey),
});
