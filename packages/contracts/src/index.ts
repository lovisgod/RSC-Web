import { z } from "zod";

export const NIGERIAN_MOBILE_NUMBER_PATTERN = /^(?:\+?234|0)[789][01]\d{8}$/;

export const customerStatusSchema = z.enum(["UNVERIFIED", "ACTIVE", "SUSPENDED"]);
export const userRoleSchema = z.enum(["SUPER_ADMIN", "CUSTOMER", "ADMIN", "RIDER"]);

export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    message: z.string().min(1),
    status: z.int().min(100).max(599),
  });

export const apiErrorDataSchema = z.object({
  errors: z.array(z.string()),
  path: z.string(),
  requestId: z.string().nullable(),
  timestamp: z.iso.datetime(),
});

export const apiErrorResponseSchema = apiResponseSchema(apiErrorDataSchema);

export const registerCustomerInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().regex(NIGERIAN_MOBILE_NUMBER_PATTERN),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    password: z.string().min(8).max(128),
  })
  .strict();

export const registrationResultSchema = z.object({
  customerId: z.uuid(),
  status: z.literal("UNVERIFIED"),
  otpExpiresInSeconds: z.int().positive(),
  verificationChannels: z.object({
    email: z.boolean(),
    phone: z.boolean(),
  }),
});

export const verificationChannelSchema = z.enum(["phone", "email"]);

export const verifyUserInputSchema = z.discriminatedUnion("channel", [
  z
    .object({
      channel: z.literal("phone"),
      phone: z.string().trim().regex(NIGERIAN_MOBILE_NUMBER_PATTERN),
      code: z.string().regex(/^\d{6}$/),
    })
    .strict(),
  z
    .object({
      channel: z.literal("email"),
      email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
      code: z.string().regex(/^\d{6}$/),
    })
    .strict(),
]);

export const userVerificationResultSchema = z.object({
  customerId: z.uuid(),
  status: z.literal("ACTIVE"),
  channel: verificationChannelSchema,
  verifiedAt: z.iso.datetime(),
  verificationChannels: z.object({
    email: z.boolean(),
    phone: z.boolean(),
  }),
});

export const loginInputSchema = z
  .object({
    identifier: z.string().trim().toLowerCase().min(1),
    password: z.string().min(8).max(128),
  })
  .strict();

export const loginResultSchema = z.object({
  user: z.object({
    id: z.uuid(),
    role: userRoleSchema,
    outletId: z.uuid().nullable(),
  }),
  accessTokenExpiresInSeconds: z.int().positive(),
  refreshTokenExpiresInSeconds: z.int().positive(),
});

export const logoutResultSchema = z.object({
  loggedOut: z.literal(true),
});

export const createAdminInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    phone: z.string().trim().regex(NIGERIAN_MOBILE_NUMBER_PATTERN),
    outletId: z.uuid(),
  })
  .strict();

export const adminResultSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  role: z.literal("ADMIN"),
  outletId: z.uuid(),
  temporaryPassword: z.string().min(8),
});

export const outletAdminSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  role: z.literal("ADMIN"),
  outletId: z.uuid(),
  email: z.email(),
  phone: z.string().min(1),
  status: customerStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const resendVerificationCodeInputSchema = z.discriminatedUnion("channel", [
  z
    .object({
      channel: z.literal("phone"),
      phone: z.string().trim().regex(NIGERIAN_MOBILE_NUMBER_PATTERN),
    })
    .strict(),
  z
    .object({
      channel: z.literal("email"),
      email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    })
    .strict(),
]);

export const resendVerificationCodeResultSchema = z.object({
  sent: z.literal(true),
  channel: verificationChannelSchema,
  otpExpiresInSeconds: z.int().positive(),
});

export const registrationResponseSchema = apiResponseSchema(registrationResultSchema);
export const userVerificationResponseSchema = apiResponseSchema(userVerificationResultSchema);
export const resendVerificationCodeResponseSchema = apiResponseSchema(
  resendVerificationCodeResultSchema,
);
export const loginResponseSchema = apiResponseSchema(loginResultSchema);
export const logoutResponseSchema = apiResponseSchema(logoutResultSchema);
export const adminResponseSchema = apiResponseSchema(adminResultSchema);

export const currencySchema = z.literal("NGN");

export const moneySchema = z.object({
  amountMinor: z.int().nonnegative(),
  currency: currencySchema,
});

export const outletSummarySchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  cuisineType: z.string().min(1),
  description: z.string().nullable(),
  imageUrl: z.url().nullable(),
  isOnline: z.boolean(),
  vatBps: z.int().min(0).max(10_000).default(0),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  deliveryRadiusKm: z.coerce.number().positive(),
});

export const menuItemSchema = z.object({
  id: z.uuid(),
  outletId: z.uuid(),
  categoryId: z.uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  imageUrl: z.url().nullable(),
  deliveryTimeRange: z.string().nullable().optional(),
  ratingAverage: z.coerce.number().min(0).max(5).default(0),
  ratingCount: z.int().nonnegative().default(0),
  priceMinor: z.int().nonnegative(),
  currency: currencySchema,
  isAvailable: z.boolean(),
  sortOrder: z.int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});

export const updateMenuItemAvailabilityInputSchema = z
  .object({
    isAvailable: z.boolean(),
  })
  .strict();

export const masterOrderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PARTIALLY_READY",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

export const subOrderStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "COLLECTED",
  "DISPATCHED",
  "REJECTED",
]);

export const deliveryModeSchema = z.enum(["DELIVERY", "TAKEOUT"]);

export const adminOrdersQuerySchema = z
  .object({
    outletId: z.uuid().optional(),
    status: masterOrderStatusSchema.optional(),
    subOrderStatus: subOrderStatusSchema.optional(),
    deliveryMode: deliveryModeSchema.optional(),
    customerId: z.uuid().optional(),
    dateFrom: z.iso.datetime().optional(),
    dateTo: z.iso.datetime().optional(),
    limit: z.int().min(1).max(100).optional(),
    offset: z.int().min(0).optional(),
  })
  .strict();

export const adminOrderMasterSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
  riderId: z.uuid().nullable(),
  status: masterOrderStatusSchema,
  subtotalMinor: z.int().nonnegative(),
  deliveryFeeMinor: z.int().nonnegative(),
  serviceFeeMinor: z.int().nonnegative(),
  vatMinor: z.int().nonnegative(),
  discountMinor: z.int().nonnegative(),
  totalMinor: z.int().nonnegative(),
  currency: currencySchema,
  deliveryMode: deliveryModeSchema,
  deliveryAddress: z.string().nullable(),
  deliveryLatitude: z.number().nullable(),
  deliveryLongitude: z.number().nullable(),
  paymentReference: z.string().nullable(),
  deliveryCode: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});

export const adminOrderSubOrderSchema = z.object({
  id: z.uuid(),
  masterOrderId: z.uuid(),
  outletId: z.uuid(),
  status: subOrderStatusSchema,
  subtotalMinor: z.int().nonnegative(),
  commissionMinor: z.int().nonnegative(),
  netMinor: z.int().nonnegative(),
  currency: currencySchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});

export const adminOrderLineItemSchema = z.object({
  id: z.uuid(),
  masterOrderId: z.uuid(),
  subOrderId: z.uuid(),
  outletId: z.uuid(),
  menuItemId: z.uuid().nullable(),
  itemNameSnapshot: z.string().min(1),
  unitPriceMinor: z.int().nonnegative(),
  quantity: z.int().positive(),
  lineTotalMinor: z.int().nonnegative(),
  currency: currencySchema,
  modifiersSnapshot: z.array(z.unknown()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});

export const adminOrderSummarySchema = z.object({
  order: adminOrderMasterSchema,
  subOrders: z.array(adminOrderSubOrderSchema),
  lineItems: z.array(adminOrderLineItemSchema),
});

export const adminOrdersResultSchema = z.object({
  orders: z.array(adminOrderSummarySchema),
  total: z.int().nonnegative(),
  limit: z.int().min(1).max(100),
  offset: z.int().min(0),
});

export const adminOverviewSchema = z.object({
  generatedAt: z.iso.datetime(),
  activeOutlets: z.int().nonnegative(),
  openMasterOrders: z.int().nonnegative(),
  delayedSubOrders: z.int().nonnegative(),
  pendingSettlements: moneySchema,
});

export const profileSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  role: userRoleSchema,
  outletId: z.uuid().nullable(),
  avatarUrl: z.url().nullable(),
  email: z.email(),
  phone: z.string().min(1),
  verificationChannels: z.object({
    email: z.boolean(),
    phone: z.boolean(),
  }),
  pendingVerificationChannels: z.object({
    email: z.boolean(),
    phone: z.boolean(),
  }),
});

export const updateProfileInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().regex(NIGERIAN_MOBILE_NUMBER_PATTERN).optional(),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)).optional(),
    avatarUrl: z.url().max(512).optional(),
  })
  .strict();

export const profileUpdateResultSchema = profileSchema.extend({
  otpExpiresInSeconds: z.int().positive().nullable(),
});

export const verifyProfileChangeInputSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/),
  })
  .strict();

export const notificationSchema = z.object({
  id: z.uuid(),
  recipientId: z.uuid(),
  recipientRole: userRoleSchema,
  type: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  isRead: z.boolean(),
  createdAt: z.iso.datetime(),
});

export const notificationCampaignTargetSegmentSchema = z.enum([
  "ALL_CUSTOMERS",
  "ACTIVE_CUSTOMERS",
  "CUSTOMERS_WITH_DEVICE_TOKEN",
]);

export const notificationCampaignStatusSchema = z.enum([
  "SCHEDULED",
  "DISPATCHING",
  "SENT",
  "FAILED",
]);

export const createNotificationCampaignInputSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    body: z.string().trim().min(2).max(2_000),
    targetSegment: notificationCampaignTargetSegmentSchema,
    scheduledAt: z.iso.datetime(),
    deepLink: z.string().trim().max(512).optional(),
  })
  .strict();

export const notificationCampaignSchema = z.object({
  id: z.uuid(),
  createdById: z.uuid(),
  title: z.string().min(1),
  body: z.string().min(1),
  targetSegment: notificationCampaignTargetSegmentSchema,
  deepLink: z.string().nullable(),
  scheduledAt: z.iso.datetime(),
  status: notificationCampaignStatusSchema,
  totalTargeted: z.int().nonnegative(),
  sentCount: z.int().nonnegative(),
  failedCount: z.int().nonnegative(),
  dispatchedAt: z.iso.datetime().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Money = z.infer<typeof moneySchema>;
export type ApiResponse<T> = {
  data: T;
  message: string;
  status: number;
};
export type ApiErrorData = z.infer<typeof apiErrorDataSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type CustomerStatus = z.infer<typeof customerStatusSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type RegisterCustomerInput = z.infer<typeof registerCustomerInputSchema>;
export type RegistrationResult = z.infer<typeof registrationResultSchema>;
export type VerificationChannel = z.infer<typeof verificationChannelSchema>;
export type VerifyUserInput = z.infer<typeof verifyUserInputSchema>;
export type UserVerificationResult = z.infer<typeof userVerificationResultSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type LoginResult = z.infer<typeof loginResultSchema>;
export type LogoutResult = z.infer<typeof logoutResultSchema>;
export type CreateAdminInput = z.infer<typeof createAdminInputSchema>;
export type AdminResult = z.infer<typeof adminResultSchema>;
export type OutletAdmin = z.infer<typeof outletAdminSchema>;
export type ResendVerificationCodeInput = z.infer<typeof resendVerificationCodeInputSchema>;
export type ResendVerificationCodeResult = z.infer<typeof resendVerificationCodeResultSchema>;
export type OutletSummary = z.infer<typeof outletSummarySchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type UpdateMenuItemAvailabilityInput = z.infer<typeof updateMenuItemAvailabilityInputSchema>;
export type MasterOrderStatus = z.infer<typeof masterOrderStatusSchema>;
export type SubOrderStatus = z.infer<typeof subOrderStatusSchema>;
export type DeliveryMode = z.infer<typeof deliveryModeSchema>;
export type AdminOrdersQuery = z.infer<typeof adminOrdersQuerySchema>;
export type AdminOrderMaster = z.infer<typeof adminOrderMasterSchema>;
export type AdminOrderSubOrder = z.infer<typeof adminOrderSubOrderSchema>;
export type AdminOrderLineItem = z.infer<typeof adminOrderLineItemSchema>;
export type AdminOrderSummary = z.infer<typeof adminOrderSummarySchema>;
export type AdminOrdersResult = z.infer<typeof adminOrdersResultSchema>;
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
export type ProfileUpdateResult = z.infer<typeof profileUpdateResultSchema>;
export type VerifyProfileChangeInput = z.infer<typeof verifyProfileChangeInputSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationCampaignTargetSegment = z.infer<
  typeof notificationCampaignTargetSegmentSchema
>;
export type NotificationCampaignStatus = z.infer<typeof notificationCampaignStatusSchema>;
export type CreateNotificationCampaignInput = z.infer<typeof createNotificationCampaignInputSchema>;
export type NotificationCampaign = z.infer<typeof notificationCampaignSchema>;
