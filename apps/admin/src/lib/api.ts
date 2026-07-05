import axios, { type AxiosError } from "axios";
import { SERVER_ERROR_MESSAGE } from "@rsc/api-client";
import {
  operationsQueueSchema,
  operationsStatsQuerySchema,
  operationsSummarySchema,
  orderPulseQuerySchema,
  orderPulseSchema,
  platformChargesSchema,
  updatePlatformChargesInputSchema,
  type OperationsQueue,
  type OperationsStatsQuery,
  type OperationsSummary,
  type OrderPulse,
  type OrderPulseQuery,
  type PlatformCharges,
  type AdminResult,
  type CreateAdminInput,
  type CustomerOrder,
  type ForgotPasswordResult,
  type LoginResult,
  type LogoutResult,
  type MenuItem,
  type NotificationCampaign,
  type CreateNotificationCampaignInput,
  type OrderLineItem,
  type OutletSummary,
  type RegistrationResult,
  type ResendVerificationCodeResult,
  type ResetPasswordResult,
  type SubOrderDetail,
  type UserVerificationResult,
  type UpdatePlatformChargesInput,
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

// ─── Media ────────────────────────────────────────────────────────────────────

export const uploadImage = (file: File): Promise<{ url: string }> => {
  const fd = new FormData();
  fd.append("image", file);
  return post("/api/v1/media/images", fd);
};

// ─── Outlets ──────────────────────────────────────────────────────────────────

export interface OutletBody {
  name: string;
  description?: string;
  cuisineType: string;
  isOnline?: boolean;
  momentSubaccountCode: string;
  imageUrl?: string;
}

export const listOutlets = (): Promise<OutletSummary[]> => get("/api/v1/outlets");

export const getOutlet = (id: string): Promise<OutletSummary> => get(`/api/v1/outlets/${id}`);

export const createOutlet = (body: OutletBody): Promise<OutletSummary> =>
  post("/api/v1/outlets", body);

export const updateOutlet = (id: string, body: Partial<OutletBody>): Promise<OutletSummary> =>
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

export interface AdminOrdersQuery {
  outletId?: string;
  status?: string;
  subOrderStatus?: string;
  deliveryMode?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface AdminOrderItem {
  order: CustomerOrder;
  subOrders: SubOrderDetail[];
  lineItems: OrderLineItem[];
}

export interface AdminOrdersResult {
  orders: AdminOrderItem[];
  total: number;
  limit: number;
  offset: number;
}

export const listAdminOrders = (params?: AdminOrdersQuery): Promise<AdminOrdersResult> => {
  const qs = new URLSearchParams();
  if (params?.outletId) qs.set("outletId", params.outletId);
  if (params?.status) qs.set("status", params.status);
  if (params?.subOrderStatus) qs.set("subOrderStatus", params.subOrderStatus);
  if (params?.deliveryMode) qs.set("deliveryMode", params.deliveryMode);
  if (params?.customerId) qs.set("customerId", params.customerId);
  if (params?.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params?.dateTo) qs.set("dateTo", params.dateTo);
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.offset !== undefined) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return get(`/api/v1/orders/admin${query ? `?${query}` : ""}`);
};

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

export const listNotificationCampaigns = (): Promise<NotificationCampaign[]> =>
  get("/api/v1/notifications/campaigns");

export const scheduleNotificationCampaign = (
  body: CreateNotificationCampaignInput,
): Promise<NotificationCampaign> => post("/api/v1/notifications/campaigns", body);

// ─── Admin accounts ───────────────────────────────────────────────────────────

export const createOutletAdmin = (body: CreateAdminInput): Promise<AdminResult> =>
  post("/api/v1/auth/admins", body);

export interface OutletAdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "ADMIN";
  outletId: string;
  isVerified?: boolean;
  createdAt?: string;
}

export const listOutletAdmins = (outletId?: string): Promise<OutletAdminUser[]> => {
  const qs = outletId ? `?outletId=${encodeURIComponent(outletId)}` : "";
  return get(`/api/v1/users/outlet-admins${qs}`);
};

export const deleteOutletAdmin = (id: string): Promise<void> =>
  http.delete(`/api/v1/users/outlet-admins/${id}`).then(() => undefined);

// ─── Platform charges ─────────────────────────────────────────────────────────

export const getPlatformCharges = async (): Promise<PlatformCharges> =>
  platformChargesSchema.parse(await get<unknown>("/api/v1/payments/platform-charges"));

export const updatePlatformCharges = async (
  body: UpdatePlatformChargesInput,
): Promise<PlatformCharges> => {
  const input = updatePlatformChargesInputSchema.parse(body);
  return platformChargesSchema.parse(
    await patchReq<unknown>("/api/v1/payments/platform-charges", input),
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

function statsQuery(input: OperationsStatsQuery | OrderPulseQuery): string {
  const params = new URLSearchParams();
  if (input.outletId) params.set("outletId", input.outletId);
  if ("range" in input && input.range) params.set("range", input.range);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const getOperationsSummary = async (
  input: OperationsStatsQuery = {},
): Promise<OperationsSummary> => {
  const query = operationsStatsQuerySchema.parse(input);
  return operationsSummarySchema.parse(
    await get<unknown>(`/api/v1/stats/operations/summary${statsQuery(query)}`),
  );
};

export const getOrderPulse = async (input: OrderPulseQuery = {}): Promise<OrderPulse> => {
  const query = orderPulseQuerySchema.parse(input);
  return orderPulseSchema.parse(
    await get<unknown>(`/api/v1/stats/operations/order-pulse${statsQuery(query)}`),
  );
};

export const getOperationsQueue = async (
  input: OperationsStatsQuery = {},
): Promise<OperationsQueue> => {
  const query = operationsStatsQuerySchema.parse(input);
  return operationsQueueSchema.parse(
    await get<unknown>(`/api/v1/stats/operations/queue${statsQuery(query)}`),
  );
};
