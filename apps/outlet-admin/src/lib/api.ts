import axios, { type AxiosError } from "axios";
import { SERVER_ERROR_MESSAGE } from "@rsc/api-client";
import type {
  ItemModifierGroup,
  LoginResult,
  LogoutResult,
  MasterOrderStatus,
  MenuItem,
  OutletSummary,
  SubOrderStatus,
} from "@rsc/contracts";

import { authStore } from "../stores/auth-store";

// ─── Axios instance ───────────────────────────────────────────────────────────

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  withCredentials: true,
  headers: { Accept: "application/json" },
});

const PUBLIC_AUTH_ENDPOINTS = ["/api/v1/auth/login"];

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

// ─── Outlet ───────────────────────────────────────────────────────────────────

export const getOutletById = (outletId: string): Promise<OutletSummary> =>
  get(`/api/v1/outlets/${outletId}`);

export const toggleOutletOnlineStatus = (
  outletId: string,
  body: { isOnline: boolean },
): Promise<OutletSummary> => patchReq(`/api/v1/outlets/${outletId}/online-status`, body);

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

export interface UpdateMenuItemBody {
  outletId: string;
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  deliveryTimeRange?: string;
  priceMinor: number;
  isAvailable: boolean;
  sortOrder?: number;
  modifierGroupIds?: string[];
}

export const updateMenuItem = (itemId: string, body: UpdateMenuItemBody): Promise<MenuItem> =>
  patchReq(`/api/v1/menu-items/${itemId}`, body);

export const deleteMenuItem = (itemId: string): Promise<void> =>
  http.delete(`/api/v1/menu-items/${itemId}`).then(() => undefined);

export const getMenuItemById = (itemId: string): Promise<MenuItem> =>
  get(`/api/v1/menu-items/${itemId}`);

// ─── Item modifier groups ─────────────────────────────────────────────────────

export const listItemModifierGroups = (): Promise<ItemModifierGroup[]> =>
  get("/api/v1/item-modifier-groups");

export const verifyHandoffCode = (
  outletId: string,
  body: { code: string },
): Promise<{ verified: boolean; orderId?: string }> =>
  post(`/api/v1/outlets/${outletId}/orders/verify-handoff`, body);

// ─── Orders / Sub-orders ──────────────────────────────────────────────────────

export interface PosSubOrderItemModifier {
  name: string;
  priceDeltaMinor: number;
}

export interface PosSubOrderItem {
  name: string;
  quantity: number;
  priceMinor: number;
  modifiers?: PosSubOrderItemModifier[];
}

export interface PosSubOrder {
  id: string;
  masterOrderId: string;
  status: SubOrderStatus;
  deliveryMode: string;
  deliveryCode: string;
  items: PosSubOrderItem[];
  totalAmountMinor: number;
  createdAt: string;
  estimatedPrepTimeMinutes?: number;
}

// ─── GET /api/v1/orders/admin response types ──────────────────────────────────

interface AdminLineItem {
  id: string;
  subOrderId: string;
  outletId: string;
  itemNameSnapshot: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  modifiersSnapshot: { id: string; name: string; priceDeltaMinor: number }[];
}

interface AdminSubOrder {
  id: string;
  masterOrderId: string;
  outletId: string;
  status: string;
  subtotalMinor: number;
  currency: string;
  createdAt: string;
  preparationTimeMinutes?: number;
}

interface AdminOrderEntry {
  order: {
    id: string;
    deliveryMode: string;
    deliveryCode: string;
    createdAt: string;
  };
  subOrders: AdminSubOrder[];
  lineItems: AdminLineItem[];
}

interface AdminOrdersData {
  orders: AdminOrderEntry[];
  total: number;
  limit: number;
  offset: number;
}

function toSubOrders(data: AdminOrdersData, outletId: string): PosSubOrder[] {
  return data.orders.flatMap(({ order, subOrders, lineItems }) =>
    subOrders
      .filter((sub) => sub.outletId === outletId)
      .map((sub) => ({
        id: sub.id,
        masterOrderId: order.id,
        status: sub.status as SubOrderStatus,
        deliveryMode: order.deliveryMode,
        deliveryCode: order.deliveryCode,
        items: lineItems
          .filter((li) => li.subOrderId === sub.id)
          .map((li) => ({
            name: li.itemNameSnapshot,
            quantity: li.quantity,
            priceMinor: li.unitPriceMinor,
            modifiers:
              li.modifiersSnapshot.length > 0
                ? li.modifiersSnapshot.map((m) => ({
                    name: m.name,
                    priceDeltaMinor: m.priceDeltaMinor,
                  }))
                : undefined,
          })),
        totalAmountMinor: sub.subtotalMinor,
        createdAt: sub.createdAt,
        estimatedPrepTimeMinutes: sub.preparationTimeMinutes,
      })),
  );
}

export const listAdminOrders = (outletId: string): Promise<PosSubOrder[]> =>
  get<AdminOrdersData>(`/api/v1/orders/admin?outletId=${encodeURIComponent(outletId)}`).then(
    (data) => toSubOrders(data, outletId),
  );

// PATCH /api/v1/orders/{subOrderId}/status
// Body accepts MasterOrderStatus values; the server maps them to sub-order status internally:
//   CONFIRMED → ACCEPTED | PARTIALLY_READY → PREPARING | READY → READY | DELIVERED → COLLECTED
export const updateSubOrderStatus = (
  subOrderId: string,
  body: { status: MasterOrderStatus; preparationTimeMinutes?: number },
): Promise<unknown> => patchReq(`/api/v1/orders/${subOrderId}/status`, body);
