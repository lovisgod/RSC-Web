import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

import { ApiError } from "./errors";

export interface HttpClientOptions {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null> | string | null;
}

export function createHttpClient({ baseUrl, getAccessToken }: HttpClientOptions): AxiosInstance {
  const instance = axios.create({
    baseURL: baseUrl.replace(/\/$/, ""),
    headers: {
      Accept: "application/json",
    },
    withCredentials: true,
  });

  // Attach Authorization header when a token is available.
  // getAccessToken may be async (e.g. a token-refresh call), so the
  // interceptor is async. Axios 1.x handles async request interceptors
  // correctly by awaiting them before dispatching the request.
  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken?.();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  });

  // Normalize all error responses into ApiError so callers deal with
  // one known error type. Non-HTTP errors (network timeout, CORS, offline)
  // are re-thrown unchanged.
  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (axios.isAxiosError(error) && error.response) {
        const requestId = (error.response.headers["x-request-id"] as string | undefined) ?? null;
        return Promise.reject(
          new ApiError(
            `API request failed with status ${error.response.status}`,
            error.response.status,
            requestId,
          ),
        );
      }
      return Promise.reject(error);
    },
  );

  return instance;
}
