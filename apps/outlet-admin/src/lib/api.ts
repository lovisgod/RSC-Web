import axios, { type AxiosError } from "axios";
import type {
  LoginResult,
  LogoutResult,
  MenuItem,
  MenuCategorySummary,
  OutletSummary,
  SubOrderStatus,
  UploadedImage,
} from "@rsc/contracts";

// ─── Axios instance ───────────────────────────────────────────────────────────

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "",
  withCredentials: true,
  headers: { Accept: "application/json" },
});

// Unwrap API errors into plain Error so TanStack mutation.error is always Error
http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ message?: string }>) => {
    throw new Error(err.response?.data?.message ?? err.message ?? "An unexpected error occurred");
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

export const listMenuCategories = (outletId: string): Promise<MenuCategorySummary[]> =>
  get(`/api/v1/outlets/${outletId}/menu/categories`);

export const listMenuItems = (outletId: string, categoryId?: string): Promise<MenuItem[]> =>
  get(
    categoryId
      ? `/api/v1/outlets/${outletId}/menu/items?categoryId=${categoryId}`
      : `/api/v1/outlets/${outletId}/menu/items`,
  );

export const toggleMenuItemAvailability = (
  outletId: string,
  itemId: string,
  body: { isAvailable: boolean },
): Promise<MenuItem> =>
  patchReq(`/api/v1/outlets/${outletId}/menu/items/${itemId}/availability`, body);

export interface CreateMenuItemBody {
  categoryId: string;
  name: string;
  description?: string | undefined;
  priceMinor: number;
  emoji?: string | undefined;
}

export const createMenuItem = (outletId: string, body: CreateMenuItemBody): Promise<MenuItem> =>
  post(`/api/v1/outlets/${outletId}/menu/items`, body);

export const uploadImage = (file: File): Promise<UploadedImage> => {
  const body = new FormData();
  body.append("file", file);

  return post("/api/v1/media/images", body);
};

export const verifyHandoffCode = (
  outletId: string,
  body: { code: string },
): Promise<{ verified: boolean; orderId?: string }> =>
  post(`/api/v1/outlets/${outletId}/orders/verify-handoff`, body);

// ─── Sub-orders ───────────────────────────────────────────────────────────────

export interface PosSubOrderItem {
  name: string;
  quantity: number;
  priceMinor: number;
}

export interface PosSubOrder {
  id: string;
  masterOrderId: string;
  status: string;
  items: PosSubOrderItem[];
  totalAmountMinor: number;
  customerNote: string | null;
  createdAt: string;
}

export const listSubOrders = (outletId: string): Promise<PosSubOrder[]> =>
  get(`/api/v1/outlets/${outletId}/sub-orders`);

export const updateSubOrderStatus = (
  outletId: string,
  subOrderId: string,
  body: { status: SubOrderStatus },
): Promise<PosSubOrder> =>
  patchReq(`/api/v1/outlets/${outletId}/sub-orders/${subOrderId}/status`, body);
