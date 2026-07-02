import axios, { type AxiosError } from "axios";
import { SERVER_ERROR_MESSAGE } from "@rsc/api-client";
import type {
  AdminOverview,
  AdminResult,
  CreateAdminInput,
  ForgotPasswordResult,
  LoginResult,
  LogoutResult,
  MenuItem,
  OrderSummary,
  OutletSummary,
  RegistrationResult,
  ResendVerificationCodeResult,
  ResetPasswordResult,
  UserVerificationResult,
} from "@rsc/contracts";

import { authStore } from "../stores/auth-store";

// ─── Axios instance ───────────────────────────────────────────────────────────

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  withCredentials: true,
  headers: { Accept: "application/json" },
});

const PUBLIC_AUTH_ENDPOINTS = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/verify-user",
  "/api/v1/auth/resend-verification-code",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
];

let isRedirectingToLogin = false;

function redirectOnUnauthorized(error: AxiosError) {
  const path = error.config?.url ?? "";

  if (
    error.response?.status !== 401 ||
    typeof window === "undefined" ||
    isRedirectingToLogin ||
    window.location.pathname === "/login" ||
    PUBLIC_AUTH_ENDPOINTS.some((endpoint) => path.startsWith(endpoint))
  ) {
    return;
  }

  isRedirectingToLogin = true;
  authStore.setUser(null);
  window.location.replace("/login");
}

function redirectOnServerError(error: AxiosError) {
  if (
    (error.response?.status ?? 0) < 500 ||
    typeof window === "undefined" ||
    isRedirectingToLogin ||
    window.location.pathname === "/login" ||
    !authStore.isAuthenticated()
  ) {
    return;
  }

  isRedirectingToLogin = true;
  authStore.setUser(null);
  window.location.replace("/login");
}

// Unwrap API errors into plain Error so TanStack mutation.error is always Error
http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ message?: string }>) => {
    redirectOnUnauthorized(err);
    redirectOnServerError(err);
    throw new Error(
      (err.response?.status ?? 0) >= 500
        ? SERVER_ERROR_MESSAGE
        : (err.response?.data?.message ?? err.message ?? "An unexpected error occurred"),
    );
  },
);

// ─── Envelope helpers ─────────────────────────────────────────────────────────
// All API responses follow { data: T, message: string, status: number }

type Envelope<T> = { data: T; message: string; status: number };

const get = <T>(path: string): Promise<T> => http.get<Envelope<T>>(path).then((r) => r.data.data);

const post = <T>(path: string, body?: unknown): Promise<T> =>
  http.post<Envelope<T>>(path, body).then((r) => r.data.data);

const patchReq = <T>(path: string, body?: unknown): Promise<T> =>
  http.patch<Envelope<T>>(path, body).then((r) => r.data.data);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const login = (body: { identifier: string; password: string }): Promise<LoginResult> =>
  post("/api/v1/auth/login", body);

export const logout = (): Promise<LogoutResult> => post("/api/v1/auth/logout");

export interface RegisterBody {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
}

export const register = (body: RegisterBody): Promise<RegistrationResult> =>
  post("/api/v1/auth/register", body);

export const verifyUser = (
  body:
    | { channel: "phone"; phone: string; code: string }
    | { channel: "email"; email: string; code: string },
): Promise<UserVerificationResult> => post("/api/v1/auth/verify-user", body);

export const resendVerificationCode = (body: {
  channel: "phone" | "email";
  phone?: string;
  email?: string;
}): Promise<ResendVerificationCodeResult> => post("/api/v1/auth/resend-verification-code", body);

export const forgotPassword = (body: { identifier: string }): Promise<ForgotPasswordResult> =>
  post("/api/v1/auth/forgot-password", body);

export const resetPassword = (body: {
  identifier: string;
  newPassword: string;
  emailCode?: string;
  phoneCode?: string;
}): Promise<ResetPasswordResult> => post("/api/v1/auth/reset-password", body);

// ─── Outlets ──────────────────────────────────────────────────────────────────

export const listOutlets = (): Promise<OutletSummary[]> => get("/api/v1/outlets");

export const getOutlet = (id: string): Promise<OutletSummary> => get(`/api/v1/outlets/${id}`);

/** POST — send FormData (multipart) for image upload */
export const createOutlet = (body: FormData): Promise<OutletSummary> =>
  post("/api/v1/outlets", body);

/** PATCH — multipart/FormData; imageUrl field carries the new image file if provided */
export const updateOutlet = (id: string, body: FormData): Promise<OutletSummary> =>
  patchReq(`/api/v1/outlets/${id}`, body);

/** PATCH — dedicated endpoint for toggling online status only */
export const toggleOutletOnlineStatus = (
  id: string,
  body: { isOnline: boolean },
): Promise<OutletSummary> => patchReq(`/api/v1/outlets/${id}/online-status`, body);

export const deleteOutlet = (id: string): Promise<void> =>
  http.delete(`/api/v1/outlets/${id}`).then(() => undefined);

export const listMenuItems = (): Promise<MenuItem[]> => get("/api/v1/menu-items");

export const updateMenuItemAvailability = (
  id: string,
  body: { isAvailable: boolean },
): Promise<MenuItem> => patchReq(`/api/v1/menu-items/${id}/availability`, body);

// ─── Orders ───────────────────────────────────────────────────────────────────

export const listOrders = (query?: string): Promise<OrderSummary[]> =>
  get(`/api/v1/orders${query ? `?q=${encodeURIComponent(query)}` : ""}`);

// ─── Notifications ────────────────────────────────────────────────────────────

export interface SendPromoBody {
  type: string;
  title: string;
  body: string;
  recipientRole: string;
  promoCode: string;
}

export const sendPromoNotification = (body: SendPromoBody): Promise<{ sent: number }> =>
  post("/api/v1/notifications/promos", body);

// ─── Admin accounts ───────────────────────────────────────────────────────────

export const createOutletAdmin = (body: CreateAdminInput): Promise<AdminResult> =>
  post("/api/v1/auth/admins", body);

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getAdminOverview = (): Promise<AdminOverview> => get("/api/v1/admin/overview");
