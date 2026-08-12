import axios, { type AxiosError } from "axios";
import { SERVER_ERROR_MESSAGE } from "@rsc/api-client";
import {
  adminOrdersResultSchema,
  changePasswordInputSchema,
  changePasswordResultSchema,
  type AdminOrdersResult,
  type ChangePasswordInput,
  type ChangePasswordResult,
  type ItemModifierGroup,
  type ItemModifier,
  type LoginResult,
  type LogoutResult,
  type MasterOrderStatus,
  type MenuItem,
  type OutletSummary,
  type SubOrderStatus,
  type UploadedImage,
  outletSummarySchema,
  userProfileSchema,
  type UserProfile,
} from "@rsc/contracts";

import { authStore } from "../stores/auth-store";

// ─── Axios instance ───────────────────────────────────────────────────────────

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  withCredentials: true,
  headers: { Accept: "application/json" },
});

const PUBLIC_AUTH_ENDPOINTS = ["/api/v1/auth/login", "/api/v1/auth/refresh"];

let isRedirectingToLogin = false;
let refreshPromise: Promise<void> | null = null;

function shouldAttemptRefresh(error: AxiosError) {
  const path = error.config?.url ?? "";
  const config = error.config as typeof error.config & {
    __isRetryRequest?: boolean;
    __skipAuthRefresh?: boolean;
  };

  return (
    error.response?.status === 401 &&
    Boolean(error.config) &&
    !config.__isRetryRequest &&
    !config.__skipAuthRefresh &&
    !PUBLIC_AUTH_ENDPOINTS.some((endpoint) => path.startsWith(endpoint))
  );
}

function refreshSession(): Promise<void> {
  refreshPromise ??= axios
    .post<Envelope<unknown>>("/api/v1/auth/refresh", undefined, {
      baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
      withCredentials: true,
      headers: { Accept: "application/json" },
    })
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

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

// Unwrap API errors into plain Error so TanStack mutation.error is always Error
http.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<{ message?: string }>) => {
    if (shouldAttemptRefresh(err)) {
      try {
        await refreshSession();
        const config = err.config as typeof err.config & { __isRetryRequest?: boolean };
        config.__isRetryRequest = true;
        return await http.request(config);
      } catch {
        // Fall through to login redirect and normal error handling.
      }
    }

    redirectOnUnauthorized(err);
    throw new Error(
      (err.response?.status ?? 0) >= 500
        ? SERVER_ERROR_MESSAGE
        : (err.response?.data?.message ?? err.message ?? "An unexpected error occurred"),
    );
  },
);

// ─── Envelope helpers ─────────────────────────────────────────────────────────

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

export const changePassword = async (body: ChangePasswordInput): Promise<ChangePasswordResult> => {
  const payload = changePasswordInputSchema.parse(body);
  return changePasswordResultSchema.parse(
    await post<unknown>("/api/v1/auth/change-password", payload),
  );
};

export const getProfile = async (): Promise<UserProfile> =>
  userProfileSchema.parse(await get<unknown>("/api/v1/users/me"));

// ─── Outlet ───────────────────────────────────────────────────────────────────

export const getOutletById = (outletId: string): Promise<OutletSummary> =>
  get<unknown>(`/api/v1/outlets/${outletId}`).then((data) => outletSummarySchema.parse(data));

export const uploadOutletBanner = (outletId: string, file: File): Promise<OutletSummary> => {
  const form = new FormData();
  form.append("file", file);
  return http
    .post<Envelope<unknown>>(`/api/v1/outlets/${outletId}/banner`, form)
    .then((response) => outletSummarySchema.parse(response.data.data));
};

export const toggleOutletOnlineStatus = (
  outletId: string,
  body: { isOnline: boolean },
): Promise<OutletSummary> => patchReq(`/api/v1/outlets/${outletId}/online-status`, body);

export interface ProvisionSubaccountBody {
  businessName: string;
  bankCode: string;
  accountNumber: string;
  force?: boolean;
}

export const provisionSubaccount = (
  outletId: string,
  body: ProvisionSubaccountBody,
): Promise<{ subaccountCode: string; outlet: OutletSummary }> =>
  post(`/api/v1/outlets/${outletId}/subaccount`, body);

export const setSubaccountCode = (
  outletId: string,
  body: { subaccountCode: string },
): Promise<{ subaccountCode: string; outlet: OutletSummary }> =>
  http.put(`/api/v1/outlets/${outletId}/subaccount-code`, body).then((r) => r.data.data);

export const listBanks = (): Promise<Array<{ code: string; name: string }>> =>
  get("/api/v1/payments/banks");

export const resolveBankAccount = (
  accountNumber: string,
  bankCode: string,
): Promise<{ accountNumber: string; accountName: string; bankCode: string }> =>
  get(
    `/api/v1/payments/resolve-account?accountNumber=${encodeURIComponent(accountNumber)}&bankCode=${encodeURIComponent(bankCode)}`,
  );

// ─── Menu ─────────────────────────────────────────────────────────────────────

export const toggleMenuItemAvailability = (
  itemId: string,
  body: { isAvailable: boolean },
): Promise<MenuItem> => patchReq(`/api/v1/menu-items/${itemId}/availability`, body);

export interface CreateMenuItemBody {
  outletId: string;
  categoryId: string;
  name: string;
  description?: string;
  deliveryTimeRange?: string;
  priceMinor: number;
  discountPriceMinor?: number | null;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  isAvailable: boolean;
  sortOrder?: number;
  modifierGroupIds?: string[];
}

// Step 1: create the item as JSON → returns item with id
export const createMenuItem = (body: CreateMenuItemBody): Promise<MenuItem> =>
  post("/api/v1/menu-items", body);

// Step 2: upload image using the id returned by step 1
export const uploadMenuItemImage = (itemId: string, file: File): Promise<MenuItem> => {
  const form = new FormData();
  form.append("file", file);
  return http
    .post<Envelope<MenuItem>>(`/api/v1/menu-items/${itemId}/image`, form)
    .then((r) => r.data.data);
};

export type UpdateMenuItemBody = Partial<CreateMenuItemBody> & {
  imageUrl?: string;
};

export const updateMenuItem = (itemId: string, body: UpdateMenuItemBody): Promise<MenuItem> =>
  patchReq(`/api/v1/menu-items/${itemId}`, body);

export const deleteMenuItem = (itemId: string): Promise<void> =>
  http.delete(`/api/v1/menu-items/${itemId}`).then(() => undefined);

export const getMenuItemById = (itemId: string): Promise<MenuItem> =>
  get(`/api/v1/menu-items/${itemId}`);

// ─── Item modifier groups ─────────────────────────────────────────────────────

export const listItemModifierGroups = (outletId: string): Promise<ItemModifierGroup[]> =>
  get(`/api/v1/item-modifier-groups?outletId=${encodeURIComponent(outletId)}`);

export interface SaveItemModifierGroupBody {
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

export const uploadImage = (file: File): Promise<UploadedImage> => {
  const body = new FormData();
  body.append("file", file);

  return post("/api/v1/media/images", body);
};

/** Outlet-admin: customer walks in and presents their pickup code → marks sub-order COLLECTED. */
export const verifyTakeoutHandoff = (body: {
  code: string;
}): Promise<{
  verified: boolean;
  subOrderId: string;
  masterOrderId: string;
  masterStatus: string;
}> => post("/api/v1/orders/outlet/verify-handoff", body);

/** Outlet-admin: rider arrives at counter and presents pickup code → marks sub-order DISPATCHED. */
export const riderCollect = (body: {
  code: string;
  note?: string;
}): Promise<{
  collected: boolean;
  subOrderId: string;
  masterOrderId: string;
  masterStatus: string;
}> => post("/api/v1/orders/outlet/rider-collect", body);

// ─── Orders / Sub-orders ──────────────────────────────────────────────────────

export interface PosSubOrderItemModifier {
  name: string;
  priceDeltaMinor: number;
}

export interface PosSubOrderItem {
  name: string;
  quantity: number;
  priceMinor: number;
  lineTotalMinor: number;
  customerNote?: string;
  modifiers?: PosSubOrderItemModifier[];
}

export interface PosSubOrder {
  id: string;
  masterOrderId: string;
  masterOrderStatus: MasterOrderStatus;
  status: SubOrderStatus;
  pickupCode?: string;
  deliveryMode: string;
  deliveryCode: string | null;
  items: PosSubOrderItem[];
  totalAmountMinor: number;
  totalSubOrders: number;
  createdAt: string;
  updatedAt: string;
  preparationNote?: string;
  estimatedPrepTimeMinutes?: number;
}

function toSubOrders(data: AdminOrdersResult, outletId: string): PosSubOrder[] {
  return data.orders.flatMap(({ order, subOrders, lineItems }) =>
    subOrders
      .filter((sub) => sub.outletId === outletId)
      .map((sub) => ({
        id: sub.id,
        masterOrderId: order.id,
        masterOrderStatus: order.status,
        status: sub.status as SubOrderStatus,
        ...(sub.pickupCode ? { pickupCode: sub.pickupCode } : {}),
        deliveryMode: order.deliveryMode,
        deliveryCode: order.deliveryCode,
        items: lineItems
          .filter((li) => li.subOrderId === sub.id)
          .map((li) => ({
            name: li.itemNameSnapshot,
            quantity: li.quantity,
            priceMinor: li.unitPriceMinor,
            lineTotalMinor: li.lineTotalMinor,
            ...(typeof li.customerNote === "string" && li.customerNote.trim()
              ? { customerNote: li.customerNote.trim() }
              : {}),
            ...(li.modifiersSnapshot.length > 0
              ? {
                  modifiers: li.modifiersSnapshot.map((m) => ({
                    name: m.name,
                    priceDeltaMinor: m.priceDeltaMinor,
                  })),
                }
              : {}),
          })),
        totalAmountMinor: sub.subtotalMinor,
        totalSubOrders: subOrders.length,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        ...(sub.preparationNote ? { preparationNote: sub.preparationNote } : {}),
        ...(sub.preparationTime !== undefined && sub.preparationTime !== null
          ? { estimatedPrepTimeMinutes: sub.preparationTime }
          : sub.preparationTimeMinutes !== undefined
            ? { estimatedPrepTimeMinutes: sub.preparationTimeMinutes }
            : {}),
      })),
  );
}

const ACTIVE_QUEUE_SUB_ORDER_STATUSES = new Set<SubOrderStatus>([
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
]);

export function isActiveQueueOrder(order: PosSubOrder): boolean {
  return (
    order.masterOrderStatus !== "PENDING_PAYMENT" &&
    order.masterOrderStatus !== "DELIVERED" &&
    order.masterOrderStatus !== "CANCELLED" &&
    ACTIVE_QUEUE_SUB_ORDER_STATUSES.has(order.status)
  );
}

export const listAdminOrders = (outletId: string): Promise<PosSubOrder[]> =>
  get<unknown>(`/api/v1/orders/admin?outletId=${encodeURIComponent(outletId)}`)
    .then((data) => adminOrdersResultSchema.parse(data))
    .then((data) => toSubOrders(data, outletId));

// PATCH /api/v1/orders/{subOrderId}/status
// Body accepts MasterOrderStatus values; the server maps them to sub-order status internally:
//   CONFIRMED → ACCEPTED | PREPARING → PREPARING | READY/PARTIALLY_READY → READY | DELIVERED → COLLECTED
export const updateSubOrderStatus = (
  subOrderId: string,
  body: { status: MasterOrderStatus; preparationTime?: number; rejectionReason?: string },
): Promise<unknown> => patchReq(`/api/v1/orders/${subOrderId}/status`, body);
