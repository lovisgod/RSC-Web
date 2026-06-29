import {
  adminOverviewSchema,
  apiErrorResponseSchema,
  apiResponseSchema,
  changePasswordInputSchema,
  changePasswordResultSchema,
  userProfileSchema,
  updateProfileInputSchema,
  createDeliveryAddressInputSchema,
  deliveryAddressSummarySchema,
  validateAddressInputSchema,
  validateAddressResultSchema,
  forgotPasswordInputSchema,
  forgotPasswordResultSchema,
  menuCategorySchema,
  menuItemSchema,
  resetPasswordInputSchema,
  resetPasswordResultSchema,
  loginInputSchema,
  loginResultSchema,
  outletSummarySchema,
  registerCustomerInputSchema,
  registrationResultSchema,
  resendVerificationInputSchema,
  resendVerificationResultSchema,
  userVerificationResultSchema,
  verifyUserInputSchema,
  type AdminOverview,
  type ChangePasswordInput,
  type ChangePasswordResult,
  type UserProfile,
  type UpdateProfileInput,
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
    logout(): Promise<{ loggedOut: boolean }> {
      return request("/api/v1/auth/logout", z.object({ loggedOut: z.boolean() }), {
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
    listMenuItems(outletId: string): Promise<MenuItemSummary[]> {
      return request(
        `/api/v1/menu-items?outletId=${encodeURIComponent(outletId)}`,
        z.array(menuItemSchema),
      );
    },
    getAdminOverview(): Promise<AdminOverview> {
      return request("/api/v1/admin/overview", adminOverviewSchema);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
