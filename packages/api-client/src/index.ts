import {
  adminResultSchema,
  apiErrorResponseSchema,
  apiResponseSchema,
  changePasswordInputSchema,
  changePasswordResultSchema,
  createAdminInputSchema,
  createGeofenceZoneInputSchema,
  createNotificationCampaignInputSchema,
  createPromoInputSchema,
  geofenceZoneSchema,
  initiatePaymentInputSchema,
  initiatePaymentResultSchema,
  notificationCampaignSchema,
  notificationPreferencesSchema,
  paginatedMenuItemsSchema,
  pickupSubOrderInputSchema,
  platformChargesSchema,
  preparationSuggestionSchema,
  paymentRefundSchema,
  queryPreparationSuggestionsInputSchema,
  profileUpdateResultSchema,
  rateMenuItemInputSchema,
  orderDetailSchema,
  outletAdminSchema,
  userProfileSchema,
  updateProfileInputSchema,
  verifyProfileChangeInputSchema,
  updateGeofenceZoneInputSchema,
  updateMenuItemAvailabilityInputSchema,
  updateNotificationPreferencesInputSchema,
  updatePlatformChargesInputSchema,
  createDeliveryAddressInputSchema,
  deliveryAddressSummarySchema,
  deliveryAddressSuggestionSchema,
  validateAddressInputSchema,
  validateAddressResultSchema,
  resolveDeliveryAddressInputSchema,
  resolvedDeliveryAddressSchema,
  forgotPasswordInputSchema,
  forgotPasswordResultSchema,
  menuCategorySchema,
  resetPasswordInputSchema,
  resetPasswordResultSchema,
  requestRefundInputSchema,
  retryPaymentInputSchema,
  promoSchema,
  togglePromoActiveInputSchema,
  updatePromoInputSchema,
  loginInputSchema,
  loginResultSchema,
  logoutResultSchema,
  menuItemSchema,
  notificationSchema,
  paginatedCustomerOrdersSchema,
  operationsQueueSchema,
  operationsStatsQuerySchema,
  operationsSummarySchema,
  orderPulseQuerySchema,
  orderPulseSchema,
  outletSummarySchema,
  paymentVerifyResultSchema,
  riderLocationSchema,
  registerCustomerInputSchema,
  registrationResultSchema,
  resendVerificationInputSchema,
  resendVerificationResultSchema,
  rateOutletInputSchema,
  rejectAssignedOrderInputSchema,
  rejectAssignedOrderResultSchema,
  riderDispatchSchema,
  uploadedImageSchema,
  userVerificationResultSchema,
  verifyUserInputSchema,
  type AdminResult,
  type ChangePasswordInput,
  type ChangePasswordResult,
  type CreateAdminInput,
  type CreateGeofenceZoneInput,
  type CreateNotificationCampaignInput,
  type CreatePromoInput,
  type GeofenceZone,
  type InitiatePaymentInput,
  type InitiatePaymentResult,
  type NotificationCampaign,
  type NotificationPreferences,
  type PaginatedMenuItems,
  type PickupSubOrderInput,
  type PlatformCharges,
  type PreparationSuggestion,
  type PaymentRefund,
  type QueryPreparationSuggestionsInput,
  type ProfileUpdateResult,
  type RateMenuItemInput,
  type OrderDetail,
  type OutletAdmin,
  type UserProfile,
  type UpdateProfileInput,
  type VerifyProfileChangeInput,
  type UpdateGeofenceZoneInput,
  type UpdatePlatformChargesInput,
  type UpdateMenuItemAvailabilityInput,
  type UpdateNotificationPreferencesInput,
  type UpdatePromoInput,
  type CreateDeliveryAddressInput,
  type DeliveryAddressSummary,
  type DeliveryAddressSuggestion,
  type ValidateAddressInput,
  type ValidateAddressResult,
  type ResolveDeliveryAddressInput,
  type ResolvedDeliveryAddress,
  type ForgotPasswordInput,
  type ForgotPasswordResult,
  type MenuCategorySummary,
  type MenuItemSummary,
  type ResetPasswordInput,
  type ResetPasswordResult,
  type RequestRefundInput,
  type RetryPaymentInput,
  type Promo,
  type TogglePromoActiveInput,
  type LoginInput,
  type LoginResult,
  type LogoutResult,
  type MenuItem,
  type Notification,
  type PaginatedCustomerOrders,
  type OperationsQueue,
  type OperationsStatsQuery,
  type OperationsSummary,
  type OrderPulse,
  type OrderPulseQuery,
  type OutletSummary,
  type PaymentVerifyResult,
  type RiderLocation,
  type RegisterCustomerInput,
  type RegistrationResult,
  type ResendVerificationInput,
  type ResendVerificationResult,
  type RateOutletInput,
  type RejectAssignedOrderInput,
  type RejectAssignedOrderResult,
  type RiderDispatch,
  type UploadedImage,
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

export class ApiContractError extends Error {
  constructor(
    message: string,
    readonly issues: z.ZodIssue[],
  ) {
    super(message);
    this.name = "ApiContractError";
  }
}

export const SERVER_ERROR_MESSAGE = "Error encountered. Please try again later.";

function paginationQuery(input: { limit?: number; offset?: number }): string {
  const params = new URLSearchParams();
  if (input.limit !== undefined) params.set("limit", String(input.limit));
  if (input.offset !== undefined) params.set("offset", String(input.offset));
  const query = params.toString();
  return query ? `?${query}` : "";
}

function describeContractIssue(issue: z.ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join(".") : "response";

  return `${path}: ${issue.message}`;
}

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  getAccessToken?: () => Promise<string | null> | string | null;
  onUnauthorized?: (path: string) => Promise<void> | void;
  onServerError?: (path: string, status: number) => Promise<void> | void;
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

    if (response.status === 401) {
      try {
        await options.onUnauthorized?.(path);
      } catch {
        // Redirect/session cleanup failures must not hide the API response.
      }
    }

    if (response.status >= 500) {
      try {
        await options.onServerError?.(path, response.status);
      } catch {
        // Session cleanup/redirect failures must not hide the API response.
      }
    }

    if (!response.ok) {
      const errorPayload: unknown = await response.json().catch(() => null);
      const parsedError = apiErrorResponseSchema.safeParse(errorPayload);

      throw new ApiError(
        response.status >= 500
          ? SERVER_ERROR_MESSAGE
          : parsedError.success
            ? parsedError.data.message
            : `API request failed with status ${response.status}`,
        response.status,
        response.headers.get("x-request-id"),
      );
    }

    const payload: unknown = await response.json();
    const parsedEnvelope = apiResponseSchema(schema).safeParse(payload);

    if (!parsedEnvelope.success) {
      console.warn("API contract validation failed", {
        path,
        issues: parsedEnvelope.error.issues,
        fieldErrors: parsedEnvelope.error.flatten().fieldErrors,
      });
      const firstIssue = parsedEnvelope.error.issues[0];
      throw new ApiContractError(
        firstIssue
          ? `API contract validation failed for ${path}: ${describeContractIssue(firstIssue)}`
          : `API contract validation failed for ${path}.`,
        parsedEnvelope.error.issues,
      );
    }

    return parsedEnvelope.data.data;
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
    listOutletAdmins(input: { outletId?: string } = {}): Promise<OutletAdmin[]> {
      const params = new URLSearchParams();

      if (input.outletId) {
        params.set("outletId", input.outletId);
      }

      const query = params.toString();

      return request(
        `/api/v1/users/outlet-admins${query ? `?${query}` : ""}`,
        z.array(outletAdminSchema),
      );
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
    getProfile(): Promise<UserProfile> {
      return request("/api/v1/users/me", userProfileSchema);
    },
    updateProfile(input: UpdateProfileInput): Promise<ProfileUpdateResult> {
      const body = updateProfileInputSchema.parse(input);

      return request("/api/v1/users/me", profileUpdateResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    verifyProfileChange(input: VerifyProfileChangeInput): Promise<UserProfile> {
      const body = verifyProfileChangeInputSchema.parse(input);

      return request("/api/v1/users/me/verify-change", userProfileSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    uploadAvatar(file: File): Promise<UserProfile> {
      const body = new FormData();
      body.append("file", file);

      return request("/api/v1/users/me/avatar", userProfileSchema, {
        method: "POST",
        body,
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
    searchDeliveryAddressSuggestions(
      q: string,
      sessionToken?: string,
    ): Promise<DeliveryAddressSuggestion[]> {
      const params = new URLSearchParams({ q });
      if (sessionToken) params.set("sessionToken", sessionToken);

      return request(
        `/api/v1/delivery/address-suggestions?${params.toString()}`,
        z.array(deliveryAddressSuggestionSchema),
      );
    },
    resolveDeliveryAddress(
      input: ResolveDeliveryAddressInput,
    ): Promise<ResolvedDeliveryAddress | null> {
      const body = resolveDeliveryAddressInputSchema.parse(input);

      return request("/api/v1/delivery/resolve-address", resolvedDeliveryAddressSchema.nullable(), {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    listGeofenceZones(): Promise<GeofenceZone[]> {
      return request("/api/v1/delivery/geofence-zones", z.array(geofenceZoneSchema));
    },
    getGeofenceZone(id: string): Promise<GeofenceZone> {
      return request(
        `/api/v1/delivery/geofence-zones/${encodeURIComponent(id)}`,
        geofenceZoneSchema,
      );
    },
    createGeofenceZone(input: CreateGeofenceZoneInput): Promise<GeofenceZone> {
      const body = createGeofenceZoneInputSchema.parse(input);

      return request("/api/v1/delivery/geofence-zones", geofenceZoneSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    updateGeofenceZone(id: string, input: UpdateGeofenceZoneInput): Promise<GeofenceZone> {
      const body = updateGeofenceZoneInputSchema.parse(input);

      return request(
        `/api/v1/delivery/geofence-zones/${encodeURIComponent(id)}`,
        geofenceZoneSchema,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      );
    },
    deleteGeofenceZone(id: string): Promise<{ deleted: true }> {
      return request(
        `/api/v1/delivery/geofence-zones/${encodeURIComponent(id)}`,
        z.object({ deleted: z.literal(true) }),
        { method: "DELETE" },
      );
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
    rateOutlet(id: string, input: RateOutletInput): Promise<OutletSummary> {
      const body = rateOutletInputSchema.parse(input);

      return request(`/api/v1/outlets/${encodeURIComponent(id)}/rating`, outletSummarySchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
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
    searchMenuItems(params: {
      q?: string;
      outletId?: string;
      limit?: number;
      offset?: number;
    }): Promise<PaginatedMenuItems> {
      const sp = new URLSearchParams({ paginated: "true" });
      if (params.q) sp.set("q", params.q);
      if (params.outletId) sp.set("outletId", params.outletId);
      if (params.limit != null) sp.set("limit", String(params.limit));
      if (params.offset != null) sp.set("offset", String(params.offset));
      return request(`/api/v1/menu-items?${sp.toString()}`, paginatedMenuItemsSchema);
    },
    listPreparationSuggestions(
      input: QueryPreparationSuggestionsInput = {},
    ): Promise<PreparationSuggestion[]> {
      const query = queryPreparationSuggestionsInputSchema.parse(input);
      const sp = new URLSearchParams();
      if (query.outletId) sp.set("outletId", query.outletId);
      if (query.menuItemId) sp.set("menuItemId", query.menuItemId);
      if (query.q) sp.set("q", query.q);

      const qs = sp.toString();
      return request(
        `/api/v1/preparation-suggestions${qs ? `?${qs}` : ""}`,
        z.array(preparationSuggestionSchema),
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
    rateMenuItem(id: string, input: RateMenuItemInput): Promise<MenuItem> {
      const body = rateMenuItemInputSchema.parse(input);

      return request(`/api/v1/menu-items/${encodeURIComponent(id)}/rating`, menuItemSchema, {
        method: "POST",
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
    listOrders(input: { limit?: number; offset?: number } = {}): Promise<PaginatedCustomerOrders> {
      return request(`/api/v1/orders${paginationQuery(input)}`, paginatedCustomerOrdersSchema);
    },
    listCustomerOrders(
      input: { limit?: number; offset?: number } = {},
    ): Promise<PaginatedCustomerOrders> {
      return request(`/api/v1/orders${paginationQuery(input)}`, paginatedCustomerOrdersSchema);
    },
    getOrder(id: string): Promise<OrderDetail> {
      return request(`/api/v1/orders/${encodeURIComponent(id)}`, orderDetailSchema);
    },
    getRiderLocation(id: string): Promise<RiderLocation | null> {
      return request(
        `/api/v1/orders/${encodeURIComponent(id)}/rider-location`,
        riderLocationSchema.nullable(),
      );
    },
    listAssignedRiderOrders(): Promise<RiderDispatch[]> {
      return request("/api/v1/riders/me/assigned-orders", z.array(riderDispatchSchema));
    },
    rejectAssignedRiderOrder(
      id: string,
      input: RejectAssignedOrderInput,
    ): Promise<RejectAssignedOrderResult> {
      const body = rejectAssignedOrderInputSchema.parse(input);

      return request(
        `/api/v1/riders/me/assigned-orders/${encodeURIComponent(id)}/reject`,
        rejectAssignedOrderResultSchema,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      );
    },
    listNotifications(): Promise<Notification[]> {
      return request("/api/v1/notifications", z.array(notificationSchema));
    },
    listPromoNotifications(): Promise<Promo[]> {
      return request("/api/v1/notifications/promos", z.array(promoSchema));
    },
    listPromos(): Promise<Promo[]> {
      return request("/api/v1/notifications/promos", z.array(promoSchema));
    },
    createPromo(input: CreatePromoInput): Promise<{ sent: number }> {
      const body = createPromoInputSchema.parse(input);

      return request("/api/v1/notifications/promos", z.object({ sent: z.number().int() }), {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    updatePromo(id: string, input: UpdatePromoInput): Promise<Promo> {
      const body = updatePromoInputSchema.parse(input);

      return request(`/api/v1/notifications/promos/${encodeURIComponent(id)}`, promoSchema, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    togglePromoActive(id: string, input: TogglePromoActiveInput): Promise<Promo> {
      const body = togglePromoActiveInputSchema.parse(input);

      return request(`/api/v1/notifications/promos/${encodeURIComponent(id)}/active`, promoSchema, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    getNotificationPreferences(): Promise<NotificationPreferences> {
      return request("/api/v1/notifications/preferences", notificationPreferencesSchema);
    },
    updateNotificationPreferences(
      input: UpdateNotificationPreferencesInput,
    ): Promise<NotificationPreferences> {
      const body = updateNotificationPreferencesInputSchema.parse(input);

      return request("/api/v1/notifications/preferences", notificationPreferencesSchema, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
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
    reorder(id: string): Promise<InitiatePaymentInput> {
      return request(
        `/api/v1/orders/${encodeURIComponent(id)}/reorder`,
        initiatePaymentInputSchema,
      );
    },
    getPlatformCharges(): Promise<PlatformCharges> {
      return request("/api/v1/payments/platform-charges", platformChargesSchema);
    },
    updatePlatformCharges(input: UpdatePlatformChargesInput): Promise<PlatformCharges> {
      const body = updatePlatformChargesInputSchema.parse(input);

      return request("/api/v1/payments/platform-charges", platformChargesSchema, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
      const body = initiatePaymentInputSchema.parse(input);

      return request("/api/v1/payments/initiate", initiatePaymentResultSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    retryPayment(orderId: string, input: RetryPaymentInput = {}): Promise<InitiatePaymentResult> {
      const body = retryPaymentInputSchema.parse(input);

      return request(
        `/api/v1/payments/orders/${encodeURIComponent(orderId)}/retry`,
        initiatePaymentResultSchema,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    },
    verifyPayment(reference: string): Promise<PaymentVerifyResult> {
      return request(
        `/api/v1/payments/verify/${encodeURIComponent(reference)}`,
        paymentVerifyResultSchema,
      );
    },
    requestRefund(reference: string, input: RequestRefundInput = {}): Promise<PaymentRefund> {
      const body = requestRefundInputSchema.parse(input);

      return request(
        `/api/v1/payments/${encodeURIComponent(reference)}/refund-request`,
        paymentRefundSchema,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
    },
    pickupSubOrder(
      id: string,
      subOrderId: string,
      input: PickupSubOrderInput = {},
    ): Promise<unknown> {
      const body = pickupSubOrderInputSchema.parse(input);

      return request(
        `/api/v1/orders/${encodeURIComponent(id)}/sub-orders/${encodeURIComponent(subOrderId)}/pickup`,
        z.unknown(),
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      );
    },
    listDeliveryAddresses(): Promise<DeliveryAddressSummary[]> {
      return request("/api/v1/delivery/addresses", z.array(deliveryAddressSummarySchema));
    },
    deleteDeliveryAddress(id: string): Promise<unknown> {
      return request(`/api/v1/delivery/addresses/${encodeURIComponent(id)}`, z.unknown(), {
        method: "DELETE",
      });
    },
    setDefaultDeliveryAddress(id: string): Promise<DeliveryAddressSummary> {
      return request(
        `/api/v1/delivery/addresses/${encodeURIComponent(id)}/default`,
        deliveryAddressSummarySchema,
        { method: "PATCH" },
      );
    },
    deleteAccount(): Promise<unknown> {
      return request("/api/v1/users/me", z.unknown(), {
        method: "DELETE",
      });
    },
    deleteUser(id: string): Promise<unknown> {
      return request(`/api/v1/users/${encodeURIComponent(id)}`, z.unknown(), {
        method: "DELETE",
      });
    },
    getOperationsSummary(input: OperationsStatsQuery = {}): Promise<OperationsSummary> {
      const query = operationsStatsQuerySchema.parse(input);
      const params = new URLSearchParams();
      if (query.outletId) params.set("outletId", query.outletId);
      const suffix = params.size > 0 ? `?${params.toString()}` : "";

      return request(`/api/v1/stats/operations/summary${suffix}`, operationsSummarySchema);
    },
    getOrderPulse(input: OrderPulseQuery = {}): Promise<OrderPulse> {
      const query = orderPulseQuerySchema.parse(input);
      const params = new URLSearchParams();
      if (query.outletId) params.set("outletId", query.outletId);
      if (query.range) params.set("range", query.range);
      const suffix = params.size > 0 ? `?${params.toString()}` : "";

      return request(`/api/v1/stats/operations/order-pulse${suffix}`, orderPulseSchema);
    },
    getOperationsQueue(input: OperationsStatsQuery = {}): Promise<OperationsQueue> {
      const query = operationsStatsQuerySchema.parse(input);
      const params = new URLSearchParams();
      if (query.outletId) params.set("outletId", query.outletId);
      const suffix = params.size > 0 ? `?${params.toString()}` : "";

      return request(`/api/v1/stats/operations/queue${suffix}`, operationsQueueSchema);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
