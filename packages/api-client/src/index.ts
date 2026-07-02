import {
  adminOverviewSchema,
  adminOrdersQuerySchema,
  adminOrdersResultSchema,
  apiErrorResponseSchema,
  apiResponseSchema,
  adminResultSchema,
  createAdminInputSchema,
  createNotificationCampaignInputSchema,
  loginInputSchema,
  loginResultSchema,
  logoutResultSchema,
  menuItemSchema,
  notificationSchema,
  notificationCampaignSchema,
  outletAdminSchema,
  outletSummarySchema,
  profileSchema,
  profileUpdateResultSchema,
  registerCustomerInputSchema,
  registrationResultSchema,
  resendVerificationCodeInputSchema,
  resendVerificationCodeResultSchema,
  updateMenuItemAvailabilityInputSchema,
  updateProfileInputSchema,
  userVerificationResultSchema,
  verifyProfileChangeInputSchema,
  verifyUserInputSchema,
  type AdminOverview,
  type AdminOrdersQuery,
  type AdminOrdersResult,
  type AdminResult,
  type CreateAdminInput,
  type CreateNotificationCampaignInput,
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
  type ResendVerificationCodeInput,
  type ResendVerificationCodeResult,
  type UpdateMenuItemAvailabilityInput,
  type UpdateProfileInput,
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
    resendVerificationCode(
      input: ResendVerificationCodeInput,
    ): Promise<ResendVerificationCodeResult> {
      const body = resendVerificationCodeInputSchema.parse(input);

      return request("/api/v1/auth/resend-verification-code", resendVerificationCodeResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    listOutlets(): Promise<OutletSummary[]> {
      return request("/api/v1/outlets", z.array(outletSummarySchema));
    },
    listMenuItems(input: { outletId?: string } = {}): Promise<MenuItem[]> {
      const query = input.outletId ? `?outletId=${encodeURIComponent(input.outletId)}` : "";

      return request(`/api/v1/menu-items${query}`, z.array(menuItemSchema));
    },
    updateMenuItemAvailability(
      id: string,
      input: UpdateMenuItemAvailabilityInput,
    ): Promise<MenuItem> {
      const body = updateMenuItemAvailabilityInputSchema.parse(input);

      return request(`/api/v1/menu-items/${id}/availability`, menuItemSchema, {
        method: "PATCH",
        body: JSON.stringify(body),
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
