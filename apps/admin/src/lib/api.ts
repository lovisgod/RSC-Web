import axios, { type AxiosError } from "axios";
import { z } from "zod";
import { SERVER_ERROR_MESSAGE } from "@rsc/api-client";
import {
  adminOrdersQuerySchema,
  adminOrdersResultSchema,
  auditLogQuerySchema,
  operationsQueueSchema,
  operationsStatsQuerySchema,
  operationsSummarySchema,
  orderPulseQuerySchema,
  orderPulseSchema,
  outletSummarySchema,
  outletSettlementSummaryListSchema,
  outletSettlementSummarySchema,
  notificationCampaignSchema,
  paginatedAuditLogsSchema,
  promoSchema,
  paymentRefundSchema,
  platformChargesSchema,
  processRefundInputSchema,
  refundRequestListQuerySchema,
  refundRequestListSchema,
  createRiderInputSchema,
  riderResultSchema,
  riderAdminSchema,
  updateRiderInputSchema,
  updatePlatformChargesInputSchema,
  type ItemModifier,
  type ItemModifierGroup,
  type MenuCategorySummary,
  type OperationsQueue,
  type OperationsStatsQuery,
  type OperationsSummary,
  type OrderPulse,
  type OrderPulseQuery,
  type PlatformCharges,
  type AdminResult,
  type AdminOrdersQuery,
  type AdminOrdersResult,
  type AuditLogQuery,
  type CreateAdminInput,
  type ForgotPasswordResult,
  type LoginResult,
  type LogoutResult,
  type MenuItem,
  type NotificationCampaign,
  type Promo,
  type CreatePromoInput,
  type UpdatePromoInput,
  type TogglePromoActiveInput,
  type CreateNotificationCampaignInput,
  type CreateRiderInput,
  type OutletSummary,
  type OutletSettlementSummary,
  type PaginatedAuditLogs,
  type PaymentRefund,
  type RefundRequestList,
  type RefundRequestListQuery,
  type RegistrationResult,
  type ResendVerificationCodeResult,
  type ResetPasswordResult,
  type RiderResult,
  type RiderAdmin,
  type UpdateRiderInput,
  type UserVerificationResult,
  type UpdatePlatformChargesInput,
  type ProcessRefundInput,
  preparationSuggestionSchema,
  createPreparationSuggestionInputSchema,
  queryPreparationSuggestionsInputSchema,
  type PreparationSuggestion,
  type CreatePreparationSuggestionInput,
  type QueryPreparationSuggestionsInput,
} from "@rsc/contracts";

import { authStore } from "../stores/auth-store";

export type { AdminOrdersQuery, AdminOrdersResult, AuditLogQuery } from "@rsc/contracts";

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

function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    console.error("API response validation failed", parsed.error);
    throw new Error("The server response was incomplete. Please refresh and try again.");
  }

  return parsed.data;
}

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
  fd.append("file", file);
  return post("/api/v1/media/images", fd);
};

// ─── Outlets ──────────────────────────────────────────────────────────────────

export interface OutletBody {
  name: string;
  description?: string;
  cuisineType: string;
  isOnline?: boolean;
  settlementSubaccountCode?: string | null;
  imageUrl?: string;
}

export const listOutlets = (): Promise<OutletSummary[]> =>
  get<unknown>("/api/v1/outlets").then((data) => parseResponse(outletSummarySchema.array(), data));

export const getOutlet = (id: string): Promise<OutletSummary> =>
  get<unknown>(`/api/v1/outlets/${id}`).then((data) => parseResponse(outletSummarySchema, data));

export const createOutlet = (body: OutletBody): Promise<OutletSummary> =>
  post<unknown>("/api/v1/outlets", body).then((data) => parseResponse(outletSummarySchema, data));

export const updateOutlet = (id: string, body: Partial<OutletBody>): Promise<OutletSummary> =>
  patchReq<unknown>(`/api/v1/outlets/${id}`, body).then((data) =>
    parseResponse(outletSummarySchema, data),
  );

export interface OutletSettlementQuery {
  dateFrom?: string;
  dateTo?: string;
  outletId?: string;
}

function settlementQueryString(query: OutletSettlementQuery): string {
  const params = new URLSearchParams();
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.outletId) params.set("outletId", query.outletId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const listOutletSettlements = (
  query: OutletSettlementQuery = {},
): Promise<OutletSettlementSummary[]> =>
  get<unknown>(`/api/v1/finance/outlet-settlements${settlementQueryString(query)}`).then((data) =>
    outletSettlementSummaryListSchema.parse(data),
  );

// TODO: Re-enable when the real CSV export endpoint is available.
// export const exportOutletSettlements = (
//   query: OutletSettlementQuery = {},
// ): Promise<OutletSettlementExport> =>
//   get<unknown>(`/api/v1/finance/outlet-settlements/export${settlementQueryString(query)}`).then(
//     (data) => outletSettlementExportSchema.parse(data),
//   );

export const approveOutletSettlement = ({
  outletId,
  dateFrom,
  dateTo,
}: OutletSettlementQuery & { outletId: string }): Promise<OutletSettlementSummary> =>
  post<unknown>(
    `/api/v1/finance/outlet-settlements/${outletId}/approve${settlementQueryString({
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    })}`,
  ).then((data) => outletSettlementSummarySchema.parse(data));

export const processPaymentRefund = (
  reference: string,
  body: ProcessRefundInput = {},
): Promise<PaymentRefund> =>
  post<unknown>(
    `/api/v1/payments/${encodeURIComponent(reference)}/refund`,
    processRefundInputSchema.parse(body),
  ).then((data) => parseResponse(paymentRefundSchema, data));

/** PATCH — dedicated endpoint for toggling online status only */
function refundRequestsQueryString(query: RefundRequestListQuery = {}): string {
  const parsed = refundRequestListQuerySchema.parse(query);
  const params = new URLSearchParams();

  if (parsed.status) params.set("status", parsed.status);
  if (parsed.reference) params.set("reference", parsed.reference);
  if (parsed.customerId) params.set("customerId", parsed.customerId);
  if (parsed.requestedBy) params.set("requestedBy", parsed.requestedBy);
  if (parsed.dateFrom) params.set("dateFrom", parsed.dateFrom);
  if (parsed.dateTo) params.set("dateTo", parsed.dateTo);
  if (parsed.limit !== undefined) params.set("limit", String(parsed.limit));
  if (parsed.offset !== undefined) params.set("offset", String(parsed.offset));

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const listRefundRequests = (
  query: RefundRequestListQuery = {},
): Promise<RefundRequestList> =>
  get<unknown>(`/api/v1/payments/refund-requests${refundRequestsQueryString(query)}`).then((data) =>
    parseResponse(refundRequestListSchema, data),
  );

export const toggleOutletOnlineStatus = (
  id: string,
  body: { isOnline: boolean },
): Promise<OutletSummary> =>
  patchReq<unknown>(`/api/v1/outlets/${id}/online-status`, body).then((data) =>
    outletSummarySchema.parse(data),
  );

export const deleteOutlet = (id: string): Promise<void> =>
  http.delete(`/api/v1/outlets/${id}`).then(() => undefined);

export const listMenuItems = (): Promise<MenuItem[]> => get("/api/v1/menu-items");

export const updateMenuItemAvailability = (
  id: string,
  body: { isAvailable: boolean },
): Promise<MenuItem> => patchReq(`/api/v1/menu-items/${id}/availability`, body);

export interface SaveMenuCategoryBody {
  outletId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export const createMenuCategory = (body: SaveMenuCategoryBody): Promise<MenuCategorySummary> =>
  post("/api/v1/menu-categories", body);

export const updateMenuCategory = (
  categoryId: string,
  body: Partial<SaveMenuCategoryBody>,
): Promise<MenuCategorySummary> => patchReq(`/api/v1/menu-categories/${categoryId}`, body);

export const deleteMenuCategory = (categoryId: string): Promise<void> =>
  http.delete(`/api/v1/menu-categories/${categoryId}`).then(() => undefined);

export interface CreateMenuItemBody {
  outletId: string;
  categoryId: string;
  name: string;
  description?: string;
  deliveryTimeRange?: string;
  priceMinor: number;
  isAvailable: boolean;
  sortOrder?: number;
  modifierGroupIds?: string[];
}

export type UpdateMenuItemBody = Partial<CreateMenuItemBody> & {
  imageUrl?: string;
};

export const createMenuItem = (body: CreateMenuItemBody): Promise<MenuItem> =>
  post("/api/v1/menu-items", body);

export const uploadMenuItemImage = (itemId: string, file: File): Promise<MenuItem> => {
  const form = new FormData();
  form.append("file", file);
  return http
    .post<Envelope<MenuItem>>(`/api/v1/menu-items/${itemId}/image`, form)
    .then((r) => r.data.data);
};

export const updateMenuItem = (itemId: string, body: UpdateMenuItemBody): Promise<MenuItem> =>
  patchReq(`/api/v1/menu-items/${itemId}`, body);

export const deleteMenuItem = (itemId: string): Promise<void> =>
  http.delete(`/api/v1/menu-items/${itemId}`).then(() => undefined);

export const getMenuItemById = (itemId: string): Promise<MenuItem> =>
  get(`/api/v1/menu-items/${itemId}`);

export const listItemModifierGroups = (outletId: string): Promise<ItemModifierGroup[]> =>
  get(`/api/v1/item-modifier-groups?outletId=${encodeURIComponent(outletId)}`);

export interface SaveItemModifierGroupBody {
  outletId: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  sortOrder: number;
}

export const createItemModifierGroup = (
  body: SaveItemModifierGroupBody,
): Promise<ItemModifierGroup> => post("/api/v1/item-modifier-groups", body);

export const updateItemModifierGroup = (
  groupId: string,
  body: Partial<SaveItemModifierGroupBody>,
): Promise<ItemModifierGroup> => patchReq(`/api/v1/item-modifier-groups/${groupId}`, body);

export const deleteItemModifierGroup = (groupId: string): Promise<void> =>
  http.delete(`/api/v1/item-modifier-groups/${groupId}`).then(() => undefined);

export interface SaveItemModifierBody {
  outletId: string;
  groupId: string;
  name: string;
  priceDeltaMinor: number;
  isAvailable: boolean;
  sortOrder: number;
}

export const createItemModifier = (body: SaveItemModifierBody): Promise<ItemModifier> =>
  post("/api/v1/item-modifiers", body);

export const updateItemModifier = (
  modifierId: string,
  body: Partial<SaveItemModifierBody>,
): Promise<ItemModifier> => patchReq(`/api/v1/item-modifiers/${modifierId}`, body);

export const deleteItemModifier = (modifierId: string): Promise<void> =>
  http.delete(`/api/v1/item-modifiers/${modifierId}`).then(() => undefined);

// ─── Orders ───────────────────────────────────────────────────────────────────

export type AdminOrderItem = AdminOrdersResult["orders"][number];

export const listAdminOrders = (params?: AdminOrdersQuery): Promise<AdminOrdersResult> => {
  const queryParams = adminOrdersQuerySchema.parse(params ?? {});
  const qs = new URLSearchParams();
  if (queryParams.outletId) qs.set("outletId", queryParams.outletId);
  if (queryParams.status) qs.set("status", queryParams.status);
  if (queryParams.subOrderStatus) qs.set("subOrderStatus", queryParams.subOrderStatus);
  if (queryParams.deliveryMode) qs.set("deliveryMode", queryParams.deliveryMode);
  if (queryParams.customerId) qs.set("customerId", queryParams.customerId);
  if (queryParams.dateFrom) qs.set("dateFrom", queryParams.dateFrom);
  if (queryParams.dateTo) qs.set("dateTo", queryParams.dateTo);
  if (queryParams.limit !== undefined) qs.set("limit", String(queryParams.limit));
  if (queryParams.offset !== undefined) qs.set("offset", String(queryParams.offset));
  const query = qs.toString();
  return get<unknown>(`/api/v1/orders/admin${query ? `?${query}` : ""}`).then((data) =>
    adminOrdersResultSchema.parse(data),
  );
};

// ─── Notifications ────────────────────────────────────────────────────────────

export type SendPromoBody = CreatePromoInput;

export const sendPromoNotification = (body: SendPromoBody): Promise<{ sent: number }> =>
  post("/api/v1/notifications/promos", body);

export const listPromoNotifications = (): Promise<Promo[]> =>
  get<unknown>("/api/v1/notifications/promos").then((data) =>
    parseResponse(promoSchema.array(), data),
  );

export const updatePromo = (id: string, body: UpdatePromoInput): Promise<Promo> =>
  patchReq<unknown>(`/api/v1/notifications/promos/${id}`, body).then((data) =>
    parseResponse(promoSchema, data),
  );

export const togglePromoActive = (id: string, body: TogglePromoActiveInput): Promise<Promo> =>
  patchReq<unknown>(`/api/v1/notifications/promos/${id}/active`, body).then((data) =>
    parseResponse(promoSchema, data),
  );

export const listNotificationCampaigns = (): Promise<NotificationCampaign[]> =>
  get<unknown>("/api/v1/notifications/campaigns").then((data) =>
    parseResponse(notificationCampaignSchema.array(), data),
  );

export const scheduleNotificationCampaign = (
  body: CreateNotificationCampaignInput,
): Promise<NotificationCampaign> => post("/api/v1/notifications/campaigns", body);

// ─── Admin accounts ───────────────────────────────────────────────────────────

export const createOutletAdmin = (body: CreateAdminInput): Promise<AdminResult> =>
  post("/api/v1/auth/admins", body);

export const createRider = (body: CreateRiderInput): Promise<RiderResult> =>
  post<unknown>("/api/v1/users/riders", createRiderInputSchema.parse(body)).then((data) =>
    riderResultSchema.parse(data),
  );

export const listRiders = (outletId?: string): Promise<RiderAdmin[]> => {
  const qs = outletId ? `?outletId=${encodeURIComponent(outletId)}` : "";
  return get<unknown>(`/api/v1/users/riders${qs}`).then((data) =>
    z.array(riderAdminSchema).parse(data),
  );
};

export const updateRider = (id: string, body: UpdateRiderInput): Promise<RiderAdmin> => {
  const input = updateRiderInputSchema.parse(body);
  return patchReq<unknown>(`/api/v1/users/riders/${id}`, input).then((data) =>
    riderAdminSchema.parse(data),
  );
};

export const deleteRider = (id: string): Promise<void> =>
  http.delete(`/api/v1/users/riders/${id}`).then(() => undefined);

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

// ─── Audit logs ──────────────────────────────────────────────────────────────

function auditLogQueryString(input: AuditLogQuery = {}): string {
  const query = auditLogQuerySchema.parse(input);
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.actorId) params.set("actorId", query.actorId);
  if (query.action) params.set("action", query.action);
  if (query.resourceType) params.set("resourceType", query.resourceType);
  if (query.resourceId) params.set("resourceId", query.resourceId);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const listAuditLogs = (input: AuditLogQuery = {}): Promise<PaginatedAuditLogs> =>
  get<unknown>(`/api/v1/audit-logs${auditLogQueryString(input)}`).then((data) =>
    paginatedAuditLogsSchema.parse(data),
  );

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

// ─── Preparation Suggestions ─────────────────────────────────────────────────

export const listPreparationSuggestions = (
  input: QueryPreparationSuggestionsInput = {},
): Promise<PreparationSuggestion[]> => {
  const query = queryPreparationSuggestionsInputSchema.parse(input);
  const sp = new URLSearchParams();
  if (query.outletId) sp.set("outletId", query.outletId);
  if (query.menuItemId) sp.set("menuItemId", query.menuItemId);
  if (query.q) sp.set("q", query.q);
  const qs = sp.toString();
  return get<unknown>(`/api/v1/preparation-suggestions${qs ? `?${qs}` : ""}`).then((data) =>
    preparationSuggestionSchema.array().parse(data),
  );
};

export const createPreparationSuggestion = (
  input: CreatePreparationSuggestionInput,
): Promise<PreparationSuggestion> =>
  post<unknown>(
    "/api/v1/preparation-suggestions/admin",
    createPreparationSuggestionInputSchema.parse(input),
  ).then((data) => preparationSuggestionSchema.parse(data));

export const deletePreparationSuggestion = (id: string): Promise<{ deleted: true }> =>
  http.delete(`/api/v1/preparation-suggestions/admin/${encodeURIComponent(id)}`).then(() => ({
    deleted: true as const,
  }));

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
