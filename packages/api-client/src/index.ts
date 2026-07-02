import {
  adminOverviewSchema,
  adminOrdersQuerySchema,
  adminOrdersResultSchema,
  adminResultSchema,
  apiErrorResponseSchema,
  apiResponseSchema,
  changePasswordInputSchema,
  changePasswordResultSchema,
  createAdminInputSchema,
  createNotificationCampaignInputSchema,
  createDeliveryAddressInputSchema,
  customerOrderSchema,
  deliveryAddressSummarySchema,
  forgotPasswordInputSchema,
  forgotPasswordResultSchema,
  initiatePaymentInputSchema,
  initiatePaymentResultSchema,
  menuCategorySchema,
  loginInputSchema,
  loginResultSchema,
  logoutResultSchema,
  menuItemsPageSchema,
  menuItemSchema,
  notificationSchema,
  notificationCampaignSchema,
  orderSummarySchema,
  outletAdminSchema,
  outletSummarySchema,
  profileSchema,
  profileUpdateResultSchema,
  registerCustomerInputSchema,
  registrationResultSchema,
  resendVerificationInputSchema,
  resendVerificationResultSchema,
  resetPasswordInputSchema,
  resetPasswordResultSchema,
  uploadedImageSchema,
  updateMenuItemAvailabilityInputSchema,
  updateProfileInputSchema,
  validateAddressInputSchema,
  validateAddressResultSchema,
  userVerificationResultSchema,
  verifyProfileChangeInputSchema,
  verifyUserInputSchema,
  type AdminOverview,
  type AdminOrdersQuery,
  type AdminOrdersResult,
  type AdminResult,
  type ChangePasswordInput,
  type ChangePasswordResult,
  type CreateAdminInput,
  type CreateNotificationCampaignInput,
  type CreateDeliveryAddressInput,
  type CustomerOrder,
  type DeliveryAddressSummary,
  type ForgotPasswordInput,
  type ForgotPasswordResult,
  type InitiatePaymentInput,
  type InitiatePaymentResult,
  type MenuCategorySummary,
  type MenuItemsPage,
  type MenuItemSummary,
  type OrderSummary,
  type ResetPasswordInput,
  type ResetPasswordResult,
  type UploadedImage,
  type LoginInput,
  type LoginResult,
  type LogoutResult,
  type MenuItem,
  type Notification,
  type NotificationCampaign,
  type OutletAdmin,
  type OutletSummary,
  type Profile,
  type ProfileUpdateResult,
  type RegisterCustomerInput,
  type RegistrationResult,
  type ResendVerificationInput,
  type ResendVerificationResult,
  type UpdateMenuItemAvailabilityInput,
  type UpdateProfileInput,
  type ValidateAddressInput,
  type ValidateAddressResult,
  type UserVerificationResult,
  type VerifyProfileChangeInput,
  type VerifyUserInput,
} from "@rsc/contracts";
import { z } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId: string | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  getAccessToken?: () => Promise<string | null> | string | null;
}

export function createApiClient(options: ApiClientOptions) {
  const requestFetch = options.fetch ?? globalThis.fetch;
  const baseUrl = (options.baseUrl ?? "http://localhost:4000").replace(/\/$/, "");

  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await options.getAccessToken?.();
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");

    const isFormDataBody = typeof FormData !== "undefined" && init.body instanceof FormData;
    const isUrlSearchParamsBody =
      typeof URLSearchParams !== "undefined" && init.body instanceof URLSearchParams;
    const isBlobBody = typeof Blob !== "undefined" && init.body instanceof Blob;

    if (
      init.body &&
      !headers.has("content-type") &&
      !isFormDataBody &&
      !isUrlSearchParamsBody &&
      !isBlobBody
    ) {
      headers.set("content-type", "application/json");
    }

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    const response = await requestFetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const errorPayload: unknown = await response.json().catch(() => null);
      const parsedError = apiErrorResponseSchema.safeParse(errorPayload);

      throw new ApiError(
        parsedError.success
          ? parsedError.data.message
          : `API request failed with status ${response.status}`,
        response.status,
        response.headers.get("x-request-id"),
      );
    }

    const envelope = apiResponseSchema(schema).parse(await response.json());

    return envelope.data;
  }

  return {
    login(input: LoginInput): Promise<LoginResult> {
      const body = loginInputSchema.parse(input);

      return request("/api/v1/auth/login", loginResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    logout(): Promise<LogoutResult> {
      return request("/api/v1/auth/logout", logoutResultSchema, {
        method: "POST",
      });
    },
    resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResult> {
      const body = resetPasswordInputSchema.parse(input);

      return request("/api/v1/auth/reset-password", resetPasswordResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    forgotPassword(input: ForgotPasswordInput): Promise<ForgotPasswordResult> {
      const body = forgotPasswordInputSchema.parse(input);

      return request("/api/v1/auth/forgot-password", forgotPasswordResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    resendVerificationCode(input: ResendVerificationInput): Promise<ResendVerificationResult> {
      const body = resendVerificationInputSchema.parse(input);

      return request("/api/v1/auth/resend-verification-code", resendVerificationResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    registerCustomer(input: RegisterCustomerInput): Promise<RegistrationResult> {
      const body = registerCustomerInputSchema.parse(input);

      return request("/api/v1/auth/register", registrationResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    createAdmin(input: CreateAdminInput): Promise<AdminResult> {
      const body = createAdminInputSchema.parse(input);

      return request("/api/v1/auth/admins", adminResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    listOutletAdmins(): Promise<OutletAdmin[]> {
      return request("/api/v1/users/outlet-admins", z.array(outletAdminSchema));
    },
    deleteOutletAdmin(id: string): Promise<{ deleted: true }> {
      return request(`/api/v1/users/outlet-admins/${id}`, z.object({ deleted: z.literal(true) }), {
        method: "DELETE",
      });
    },
    verifyUser(input: VerifyUserInput): Promise<UserVerificationResult> {
      const body = verifyUserInputSchema.parse(input);

      return request("/api/v1/auth/verify-user", userVerificationResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    createDeliveryAddress(input: CreateDeliveryAddressInput): Promise<DeliveryAddressSummary> {
      const body = createDeliveryAddressInputSchema.parse(input);

      return request("/api/v1/delivery/addresses", deliveryAddressSummarySchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    validateAddress(input: ValidateAddressInput): Promise<ValidateAddressResult> {
      const body = validateAddressInputSchema.parse(input);

      return request("/api/v1/delivery/validate-address", validateAddressResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
      const body = changePasswordInputSchema.parse(input);

      return request("/api/v1/auth/change-password", changePasswordResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    listOutlets(): Promise<OutletSummary[]> {
      return request("/api/v1/outlets", z.array(outletSummarySchema));
    },
    listMenuCategories(outletId: string): Promise<MenuCategorySummary[]> {
      return request(
        `/api/v1/menu-categories?outletId=${encodeURIComponent(outletId)}`,
        z.array(menuCategorySchema),
      );
    },
    listMenuItems(input: { outletId?: string; q?: string } = {}): Promise<MenuItemSummary[]> {
      const params = new URLSearchParams();
      if (input.outletId) {
        params.set("outletId", input.outletId);
      }
      if (input.q) {
        params.set("q", input.q);
      }
      const query = params.toString();

      return request(`/api/v1/menu-items${query ? `?${query}` : ""}`, z.array(menuItemSchema));
    },
    listMenuItemsPage(
      input: { outletId?: string; q?: string; limit?: number; offset?: number } = {},
    ): Promise<MenuItemsPage> {
      const params = new URLSearchParams();
      params.set("paginated", "true");
      if (input.outletId) {
        params.set("outletId", input.outletId);
      }
      if (input.q) {
        params.set("q", input.q);
      }
      if (input.limit !== undefined) {
        params.set("limit", String(input.limit));
      }
      if (input.offset !== undefined) {
        params.set("offset", String(input.offset));
      }

      return request(`/api/v1/menu-items?${params.toString()}`, menuItemsPageSchema);
    },
    updateMenuItemAvailability(
      id: string,
      input: UpdateMenuItemAvailabilityInput,
    ): Promise<MenuItem> {
      const body = updateMenuItemAvailabilityInputSchema.parse(input);

      return request(`/api/v1/menu-items/${encodeURIComponent(id)}/availability`, menuItemSchema, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    uploadImage(file: Blob): Promise<UploadedImage> {
      const body = new FormData();
      body.append("file", file);

      return request("/api/v1/media/images", uploadedImageSchema, {
        method: "POST",
        body,
      });
    },
    listOrders(): Promise<OrderSummary[]> {
      return request("/api/v1/orders", z.array(orderSummarySchema));
    },
    listCustomerOrders(): Promise<CustomerOrder[]> {
      return request("/api/v1/orders", z.array(customerOrderSchema));
    },
    reorder(id: string): Promise<unknown> {
      return request(`/api/v1/orders/${encodeURIComponent(id)}/reorder`, z.unknown(), {
        method: "POST",
      });
    },
    initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
      const body = initiatePaymentInputSchema.parse(input);

      return request("/api/v1/payments/initiate", initiatePaymentResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    deleteAccount(id: string): Promise<unknown> {
      return request(`/api/v1/users/${encodeURIComponent(id)}`, z.unknown(), {
        method: "DELETE",
      });
    },
    getAdminOverview(): Promise<AdminOverview> {
      return request("/api/v1/admin/overview", adminOverviewSchema);
    },
    listAdminOrders(input: AdminOrdersQuery = {}): Promise<AdminOrdersResult> {
      const filters = adminOrdersQuerySchema.parse(input);
      const params = new URLSearchParams();

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      }

      const query = params.toString();

      return request(`/api/v1/orders/admin${query ? `?${query}` : ""}`, adminOrdersResultSchema);
    },
    getProfile(): Promise<Profile> {
      return request("/api/v1/users/me", profileSchema);
    },
    updateProfile(input: UpdateProfileInput): Promise<ProfileUpdateResult> {
      const body = updateProfileInputSchema.parse(input);

      return request("/api/v1/users/me", profileUpdateResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    verifyProfileChange(input: VerifyProfileChangeInput): Promise<Profile> {
      const body = verifyProfileChangeInputSchema.parse(input);

      return request("/api/v1/users/me/verify-change", profileSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    listNotifications(): Promise<Notification[]> {
      return request("/api/v1/notifications", z.array(notificationSchema));
    },
    scheduleNotificationCampaign(
      input: CreateNotificationCampaignInput,
    ): Promise<NotificationCampaign> {
      const body = createNotificationCampaignInputSchema.parse(input);

      return request("/api/v1/notifications/campaigns", notificationCampaignSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    listNotificationCampaigns(): Promise<NotificationCampaign[]> {
      return request("/api/v1/notifications/campaigns", z.array(notificationCampaignSchema));
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
