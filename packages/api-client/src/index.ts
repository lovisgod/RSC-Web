import {
  adminOverviewSchema,
  adminResultSchema,
  apiErrorResponseSchema,
  apiResponseSchema,
  changePasswordInputSchema,
  changePasswordResultSchema,
  createAdminInputSchema,
  customerOrderSchema,
  initiatePaymentInputSchema,
  initiatePaymentResultSchema,
  orderDetailSchema,
  orderSummarySchema,
  userProfileSchema,
  updateProfileInputSchema,
  updateMenuItemAvailabilityInputSchema,
  createDeliveryAddressInputSchema,
  deliveryAddressSummarySchema,
  validateAddressInputSchema,
  validateAddressResultSchema,
  forgotPasswordInputSchema,
  forgotPasswordResultSchema,
  menuCategorySchema,
  resetPasswordInputSchema,
  resetPasswordResultSchema,
  loginInputSchema,
  loginResultSchema,
  logoutResultSchema,
  menuItemSchema,
  notificationSchema,
  outletSummarySchema,
  registerCustomerInputSchema,
  registrationResultSchema,
  resendVerificationInputSchema,
  resendVerificationResultSchema,
  userVerificationResultSchema,
  verifyUserInputSchema,
  type AdminOverview,
  type AdminResult,
  type ChangePasswordInput,
  type ChangePasswordResult,
  type CreateAdminInput,
  type CustomerOrder,
  type InitiatePaymentInput,
  type InitiatePaymentResult,
  type OrderDetail,
  type OrderSummary,
  type UserProfile,
  type UpdateProfileInput,
  type UpdateMenuItemAvailabilityInput,
  type CreateDeliveryAddressInput,
  type DeliveryAddressSummary,
  type ValidateAddressInput,
  type ValidateAddressResult,
  type ForgotPasswordInput,
  type ForgotPasswordResult,
  type MenuCategorySummary,
  type MenuItemSummary,
  type ResetPasswordInput,
  type ResetPasswordResult,
  type LoginInput,
  type LoginResult,
  type LogoutResult,
  type MenuItem,
  type Notification,
  type OutletSummary,
  type RegisterCustomerInput,
  type RegistrationResult,
  type ResendVerificationInput,
  type ResendVerificationResult,
  type UserVerificationResult,
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
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  getAccessToken?: () => Promise<string | null> | string | null;
  onUnauthorized?: (path: string) => Promise<void> | void;
}

export function createApiClient(options: ApiClientOptions) {
  const requestFetch = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await options.getAccessToken?.();
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");

    if (init.body && !headers.has("content-type")) {
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

    if (response.status === 401) {
      try {
        await options.onUnauthorized?.(path);
      } catch {
        // Redirect/session cleanup failures must not hide the API response.
      }
    }

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
    verifyUser(input: VerifyUserInput): Promise<UserVerificationResult> {
      const body = verifyUserInputSchema.parse(input);

      return request("/api/v1/auth/verify-user", userVerificationResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    getProfile(): Promise<UserProfile> {
      return request("/api/v1/users/me", userProfileSchema);
    },
    updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
      const body = updateProfileInputSchema.parse(input);

      return request("/api/v1/users/me", userProfileSchema, {
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
    listMenuItems(input: { outletId: string }): Promise<MenuItemSummary[]> {
      return request(
        `/api/v1/menu-items?outletId=${encodeURIComponent(input.outletId)}`,
        z.array(menuItemSchema),
      );
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
    listOrders(): Promise<OrderSummary[]> {
      return request("/api/v1/orders", z.array(orderSummarySchema));
    },
    listCustomerOrders(): Promise<CustomerOrder[]> {
      return request("/api/v1/orders", z.array(customerOrderSchema));
    },
    getOrder(id: string): Promise<OrderDetail> {
      return request(`/api/v1/orders/${encodeURIComponent(id)}`, orderDetailSchema);
    },
    listNotifications(): Promise<Notification[]> {
      return request("/api/v1/notifications", z.array(notificationSchema));
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
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
