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

export const resendVerificationInputSchema = z.object({
  channel: verificationChannelSchema,
  phone: z.string().trim().regex(NIGERIAN_MOBILE_NUMBER_PATTERN).optional(),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)).optional(),
});

export const resendVerificationResultSchema = z.object({
  sent: z.boolean(),
  channel: verificationChannelSchema,
  otpExpiresInSeconds: z.int().positive(),
});

export const resetPasswordInputSchema = z
  .object({
    identifier: z.string().min(1),
    phoneCode: z.string().optional(),
    emailCode: z.string().optional(),
    newPassword: z.string().min(8).max(128),
  })
  .strict();

export const resetPasswordResultSchema = z.object({
  passwordChanged: z.boolean(),
});

export const loginInputSchema = z
  .object({
    identifier: z.string().trim().toLowerCase().min(1),
    password: z.string().min(8).max(128),
  })
  .strict();

export const forgotPasswordInputSchema = z.object({ identifier: z.string().min(1) }).strict();

export const forgotPasswordResultSchema = z.object({
  sent: z.boolean(),
  otpExpiresInSeconds: z.int().positive(),
});

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

// outletSummarySchema is defined after menuItem / modifier schemas (below) to avoid TDZ

export const userProfileSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: z.string(),
  outletId: z.uuid().nullable(),
  avatarUrl: z.url().nullable(),
  email: z.string(),
  phone: z.string(),
  verificationChannels: z.object({ email: z.boolean(), phone: z.boolean() }),
  pendingVerificationChannels: z.object({ email: z.boolean(), phone: z.boolean() }),
});

export const updateProfileInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    phone: z.string().trim().regex(NIGERIAN_MOBILE_NUMBER_PATTERN),
  })
  .strict();

export const profileUpdateResultSchema = userProfileSchema.extend({
  otpExpiresInSeconds: z.int().positive().nullable(),
});

export const verifyProfileChangeInputSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/),
  })
  .strict();

export const createDeliveryAddressInputSchema = z
  .object({
    label: z.string().min(1).max(50),
    addressLine: z.string().min(3),
    city: z.string().min(1),
    state: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
    isDefault: z.boolean(),
  })
  .strict();

export const deliveryAddressSummarySchema = z.object({
  id: z.uuid(),
  label: z.string(),
  addressLine: z.string(),
  city: z.string(),
  state: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  isDefault: z.boolean(),
});

export const validateAddressInputSchema = z
  .object({
    latitude: z.number(),
    longitude: z.number(),
  })
  .strict();

export const validateAddressResultSchema = z.object({
  deliverable: z.boolean(),
  zone: z
    .object({
      id: z.uuid(),
      name: z.string().min(1),
    })
    .nullable(),
});

export const deliveryAddressProviderSchema = z.enum(["google", "opencage"]);

export const deliveryAddressSuggestionSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  provider: deliveryAddressProviderSchema,
  sessionToken: z.string().nullable(),
});

export const resolveDeliveryAddressInputSchema = z
  .object({
    input: z.string().trim().min(3).max(200).optional(),
    suggestionId: z.string().min(1).max(500).optional(),
    provider: deliveryAddressProviderSchema.optional(),
    sessionToken: z.string().max(120).optional(),
  })
  .strict();

export const resolvedDeliveryAddressSchema = z.object({
  addressLine: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  label: z.string().min(1),
  displayName: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  provider: deliveryAddressProviderSchema,
});

export const geofenceZoneSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  polygon: z.unknown(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const geofencePolygonCoordinatesSchema = z.array(z.array(z.tuple([z.number(), z.number()])));

export const createGeofenceZoneInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    coordinates: geofencePolygonCoordinatesSchema,
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateGeofenceZoneInputSchema = createGeofenceZoneInputSchema.partial().strict();

export const changePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .strict();

export const changePasswordResultSchema = z.object({
  passwordChanged: z.boolean(),
});

export const initiatePaymentInputSchema = z
  .object({
    items: z
      .array(
        z.object({
          menuItemId: z.uuid(),
          quantity: z.int().positive(),
          modifiers: z.array(z.object({ modifierId: z.uuid() })),
          customerNote: z.string().optional(),
        }),
      )
      .min(1),
    deliveryMode: z.enum(["DELIVERY", "TAKEOUT"]),
    deliveryAddress: z.string().optional(),
    deliveryLatitude: z.number().optional(),
    deliveryLongitude: z.number().optional(),
  })
  .strict();

export const initiatePaymentResultSchema = z.object({
  masterOrderId: z.uuid(),
  paymentId: z.uuid(),
  reference: z.string(),
  checkoutUrl: z.string().nullable(),
  status: z.string(),
  totals: z.object({
    subtotalMinor: z.int().nonnegative(),
    deliveryFeeMinor: z.int().nonnegative(),
    serviceFeeMinor: z.int().nonnegative(),
    vatMinor: z.int().nonnegative(),
    totalMinor: z.int().nonnegative(),
    currency: currencySchema,
  }),
  splitBreakdown: z.array(
    z.object({
      outletId: z.uuid(),
      subaccountCode: z.string(),
      grossMinor: z.int().nonnegative(),
      commissionMinor: z.int().nonnegative(),
      netMinor: z.int().nonnegative(),
    }),
  ),
});

export const menuCategorySchema = z.object({
  id: z.uuid(),
  outletId: z.uuid(),
  name: z.string().min(1),
  sortOrder: z.int().nonnegative(),
  isActive: z.boolean(),
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

export const menuItemsPageSchema = z.object({
  items: z.array(menuItemSchema),
  total: z.int().nonnegative(),
  limit: z.int().min(1).max(100),
  offset: z.int().min(0),
  hasMore: z.boolean(),
});

export const updateMenuItemAvailabilityInputSchema = z
  .object({
    isAvailable: z.boolean(),
  })
  .strict();

export const itemModifierGroupSchema = z.object({
  id: z.uuid(),
  outletId: z.uuid(),
  name: z.string().min(1),
  minSelections: z.int().nonnegative(),
  maxSelections: z.int().positive(),
  isRequired: z.boolean(),
  sortOrder: z.int().nonnegative(),
});

export const itemModifierSchema = z.object({
  id: z.uuid(),
  outletId: z.uuid(),
  groupId: z.uuid(),
  name: z.string().min(1),
  priceDeltaMinor: z.int().nonnegative(),
  currency: currencySchema,
  isAvailable: z.boolean(),
  sortOrder: z.int().nonnegative(),
});

export const menuItemModifierGroupSchema = z.object({
  id: z.uuid(),
  menuItemId: z.uuid(),
  groupId: z.uuid(),
  sortOrder: z.int().nonnegative(),
});

export const outletSummarySchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  cuisineType: z.string().min(1),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  isOnline: z.boolean(),
  momentSubaccountCode: z.string(),
  ratingAverage: z.coerce.number().min(0).max(5).default(0),
  ratingCount: z.int().nonnegative().default(0),
  menuCategories: z.array(menuCategorySchema),
  menuItems: z.array(menuItemSchema),
  itemModifierGroups: z.array(itemModifierGroupSchema),
  itemModifiers: z.array(itemModifierSchema),
  menuItemModifierGroups: z.array(menuItemModifierGroupSchema),
});

export const rateOutletInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

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

export const orderSummarySchema = z.object({
  id: z.uuid(),
  status: masterOrderStatusSchema,
  deliveryAddress: z.string().nullable(),
  subOrders: z.array(
    z.object({
      outletName: z.string(),
    }),
  ),
  totalAmountMinor: z.int().nonnegative(),
  createdAt: z.iso.datetime(),
});

export const customerOrderSchema = z
  .object({
    id: z.uuid(),
    customerId: z.uuid(),
    riderId: z.uuid().nullable(),
    status: z.string().trim().min(1),
    subtotalMinor: z.coerce.number().int().nonnegative(),
    deliveryFeeMinor: z.coerce.number().int().nonnegative().default(0),
    serviceFeeMinor: z.coerce.number().int().nonnegative().default(0),
    vatMinor: z.coerce.number().int().nonnegative().default(0),
    discountMinor: z.coerce.number().int().nonnegative().default(0),
    totalMinor: z.coerce.number().int().nonnegative(),
    currency: currencySchema.default("NGN"),
    deliveryMode: z.enum(["DELIVERY", "TAKEOUT"]),
    deliveryAddress: z.string().nullable(),
    deliveryLatitude: z.coerce.number().min(-90).max(90).nullable(),
    deliveryLongitude: z.coerce.number().min(-180).max(180).nullable(),
    paymentReference: z.string().nullable(),
    deliveryCode: z.string().nullable(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    deletedAt: z.iso.datetime().nullable(),
  })
  .passthrough();

export const riderLocationSchema = z
  .object({
    riderId: z.uuid().nullable(),
    masterOrderId: z.uuid().nullable(),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    recordedAt: z.string().min(1),
  })
  .passthrough();

export const orderStatusEventSchema = z.object({
  id: z.uuid(),
  masterOrderId: z.uuid(),
  subOrderId: z.uuid().nullable(),
  masterStatus: z.string().nullable(),
  subOrderStatus: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export const subOrderDetailSchema = z
  .object({
    id: z.uuid(),
    masterOrderId: z.uuid(),
    outletId: z.uuid(),
    status: z.string().min(1),
    subtotalMinor: z.coerce.number().int().nonnegative(),
    commissionMinor: z.coerce.number().int().nonnegative().default(0),
    netMinor: z.coerce.number().int().nonnegative().default(0),
    currency: currencySchema.default("NGN"),
    createdAt: z.string().min(1),
  })
  .passthrough();

export const orderLineItemSchema = z
  .object({
    id: z.uuid(),
    masterOrderId: z.uuid(),
    subOrderId: z.uuid(),
    outletId: z.uuid(),
    menuItemId: z.uuid().nullable(),
    itemNameSnapshot: z.string().min(1),
    unitPriceMinor: z.coerce.number().int(),
    quantity: z.coerce.number().int().positive(),
    lineTotalMinor: z.coerce.number().int(),
    currency: currencySchema.default("NGN"),
    modifiersSnapshot: z
      .array(
        z
          .object({
            id: z.uuid().optional(),
            name: z.string().min(1),
            priceDeltaMinor: z.coerce.number().int().default(0),
          })
          .passthrough(),
      )
      .nullish()
      .transform((value) => value ?? []),
  })
  .passthrough();

export const orderDetailSchema = z
  .object({
    order: customerOrderSchema,
    subOrders: z
      .array(subOrderDetailSchema)
      .nullish()
      .transform((value) => value ?? []),
    lineItems: z
      .array(orderLineItemSchema)
      .nullish()
      .transform((value) => value ?? []),
    events: z
      .array(orderStatusEventSchema)
      .nullish()
      .transform((value) => value ?? []),
    latestRiderLocation: riderLocationSchema.nullish().transform((value) => value ?? null),
  })
  .passthrough();

export const riderDispatchSchema = z.object({
  orderId: z.uuid(),
  status: masterOrderStatusSchema,
  deliveryCodeRequired: z.literal(true),
  deliveryAddress: z.string().nullable(),
  deliveryLatitude: z.number().nullable(),
  deliveryLongitude: z.number().nullable(),
  customerId: z.uuid(),
  riderId: z.uuid().nullable(),
  outlets: z.array(
    z.object({
      subOrderId: z.uuid(),
      outletId: z.uuid(),
      outletName: z.string().min(1),
      pickupAddress: z.string().nullable(),
      pickupLatitude: z.number().nullable(),
      pickupLongitude: z.number().nullable(),
      pickupCode: z.string().min(1),
      status: subOrderStatusSchema,
      items: z.array(
        z.object({
          id: z.uuid(),
          name: z.string().min(1),
          quantity: z.coerce.number().int().positive(),
          modifiers: z.array(z.unknown()),
        }),
      ),
    }),
  ),
});

export const rejectAssignedOrderInputSchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export const rejectAssignedOrderResultSchema = z.object({
  rejected: z.literal(true),
  reassigned: z.boolean(),
  previousRiderId: z.uuid(),
  riderId: z.uuid().nullable(),
  order: orderDetailSchema,
});

export const uploadedImageSchema = z.object({
  url: z.url(),
  publicId: z.string().min(1),
});

export const notificationSchema = z.object({
  id: z.uuid(),
  recipientId: z.uuid(),
  recipientRole: z.string().trim().min(1),
  type: z.string().trim().min(1),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  data: z.record(z.string(), z.unknown()).default({}),
  isRead: z.boolean(),
  createdAt: z.iso.datetime(),
});

export const notificationPreferencesSchema = z.object({
  promotions: z.boolean(),
  discounts: z.boolean(),
  seasonalOffers: z.boolean(),
  orderStatus: z.literal(true),
});

export const updateNotificationPreferencesInputSchema = z
  .object({
    promotions: z.boolean().optional(),
    discounts: z.boolean().optional(),
    seasonalOffers: z.boolean().optional(),
    orderStatus: z.boolean().optional(),
  })
  .strict();

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

export const createNotificationCampaignInputSchema = z.object({
  title: z.string().trim().min(2).max(160),
  body: z.string().trim().min(2).max(2_000),
  targetSegment: notificationCampaignTargetSegmentSchema,
  scheduledAt: z.iso.datetime(),
  deepLink: z.string().trim().max(512).optional(),
});

export const notificationCampaignSchema = z.object({
  id: z.uuid(),
  createdById: z.uuid(),
  title: z.string(),
  body: z.string(),
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

export const operationsStatsQuerySchema = z
  .object({
    outletId: z.uuid().optional(),
  })
  .strict();

export const orderPulseRangeSchema = z.enum(["TODAY", "LAST_7_DAYS", "LAST_30_DAYS"]);

export const orderPulseQuerySchema = operationsStatsQuerySchema.extend({
  range: orderPulseRangeSchema.optional(),
});

export const operationsSummarySchema = z.object({
  activeOutlets: z.int().nonnegative(),
  openMasterOrders: z.int().nonnegative(),
  delayedSubOrders: z.int().nonnegative(),
});

export const orderPulsePointSchema = z.object({
  bucketStart: z.iso.datetime(),
  label: z.string().min(1),
  orderCount: z.int().nonnegative(),
});

export const orderPulseSchema = z.object({
  range: orderPulseRangeSchema,
  outletId: z.uuid().nullable(),
  points: z.array(orderPulsePointSchema),
});

export const operationsQueueItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("DELAYED_KITCHEN_TICKETS"),
    count: z.int().nonnegative(),
    oldestDelayMinutes: z.int().nonnegative().nullable(),
  }),
  z.object({
    type: z.literal("PAUSED_OUTLETS"),
    count: z.int().nonnegative(),
  }),
]);

export const operationsQueueSchema = z.object({
  outletId: z.uuid().nullable(),
  delayedKitchenTickets: z.int().nonnegative(),
  oldestDelayMinutes: z.int().nonnegative().nullable(),
  pausedOutlets: z.int().nonnegative(),
  items: z.array(operationsQueueItemSchema),
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
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
export type ResetPasswordResult = z.infer<typeof resetPasswordResultSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;
export type ForgotPasswordResult = z.infer<typeof forgotPasswordResultSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationInputSchema>;
export type ResendVerificationResult = z.infer<typeof resendVerificationResultSchema>;
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
export type ItemModifierGroup = z.infer<typeof itemModifierGroupSchema>;
export type ItemModifier = z.infer<typeof itemModifierSchema>;
export type MenuItemModifierGroup = z.infer<typeof menuItemModifierGroupSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type MenuItemsPage = z.infer<typeof menuItemsPageSchema>;
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
export type OperationsStatsQuery = z.infer<typeof operationsStatsQuerySchema>;
export type OrderPulseRange = z.infer<typeof orderPulseRangeSchema>;
export type OrderPulseQuery = z.infer<typeof orderPulseQuerySchema>;
export type OperationsSummary = z.infer<typeof operationsSummarySchema>;
export type OrderPulsePoint = z.infer<typeof orderPulsePointSchema>;
export type OrderPulse = z.infer<typeof orderPulseSchema>;
export type OperationsQueueItem = z.infer<typeof operationsQueueItemSchema>;
export type OperationsQueue = z.infer<typeof operationsQueueSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
export type ProfileUpdateResult = z.infer<typeof profileUpdateResultSchema>;
export type VerifyProfileChangeInput = z.infer<typeof verifyProfileChangeInputSchema>;
export type CreateDeliveryAddressInput = z.infer<typeof createDeliveryAddressInputSchema>;
export type DeliveryAddressSummary = z.infer<typeof deliveryAddressSummarySchema>;
export type ValidateAddressInput = z.infer<typeof validateAddressInputSchema>;
export type ValidateAddressResult = z.infer<typeof validateAddressResultSchema>;
export type DeliveryAddressProvider = z.infer<typeof deliveryAddressProviderSchema>;
export type DeliveryAddressSuggestion = z.infer<typeof deliveryAddressSuggestionSchema>;
export type ResolveDeliveryAddressInput = z.infer<typeof resolveDeliveryAddressInputSchema>;
export type ResolvedDeliveryAddress = z.infer<typeof resolvedDeliveryAddressSchema>;
export type GeofenceZone = z.infer<typeof geofenceZoneSchema>;
export type CreateGeofenceZoneInput = z.infer<typeof createGeofenceZoneInputSchema>;
export type UpdateGeofenceZoneInput = z.infer<typeof updateGeofenceZoneInputSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
export type ChangePasswordResult = z.infer<typeof changePasswordResultSchema>;
export type InitiatePaymentInput = z.infer<typeof initiatePaymentInputSchema>;
export type InitiatePaymentResult = z.infer<typeof initiatePaymentResultSchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export type CustomerOrder = z.infer<typeof customerOrderSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesInputSchema
>;
export type NotificationCampaignTargetSegment = z.infer<
  typeof notificationCampaignTargetSegmentSchema
>;
export type NotificationCampaignStatus = z.infer<typeof notificationCampaignStatusSchema>;
export type CreateNotificationCampaignInput = z.infer<typeof createNotificationCampaignInputSchema>;
export type NotificationCampaign = z.infer<typeof notificationCampaignSchema>;
export type MenuCategorySummary = z.infer<typeof menuCategorySchema>;
export type MenuItemSummary = z.infer<typeof menuItemSchema>;
export type RiderLocation = z.infer<typeof riderLocationSchema>;
export type OrderStatusEvent = z.infer<typeof orderStatusEventSchema>;
export type SubOrderDetail = z.infer<typeof subOrderDetailSchema>;
export type OrderLineItem = z.infer<typeof orderLineItemSchema>;
export type OrderDetail = z.infer<typeof orderDetailSchema>;
export type RiderDispatch = z.infer<typeof riderDispatchSchema>;
export type RejectAssignedOrderInput = z.infer<typeof rejectAssignedOrderInputSchema>;
export type RejectAssignedOrderResult = z.infer<typeof rejectAssignedOrderResultSchema>;
export type UploadedImage = z.infer<typeof uploadedImageSchema>;

export const paginatedMenuItemsSchema = menuItemsPageSchema;

export type PaginatedMenuItems = z.infer<typeof paginatedMenuItemsSchema>;

export const platformChargesSchema = z.object({
  platformCommissionBps: z.int().min(0).max(10_000),
  defaultVatBps: z.int().min(0).max(10_000),
  deliveryFeeMinor: z.int().nonnegative(),
  serviceFeeMinor: z.int().nonnegative(),
  currency: currencySchema,
});

export const updatePlatformChargesInputSchema = platformChargesSchema
  .omit({ currency: true })
  .partial()
  .strict();

export const pickupSubOrderInputSchema = z
  .object({
    note: z.string().max(500).optional(),
  })
  .strict();

export type PlatformCharges = z.infer<typeof platformChargesSchema>;
export type UpdatePlatformChargesInput = z.infer<typeof updatePlatformChargesInputSchema>;
export type PickupSubOrderInput = z.infer<typeof pickupSubOrderInputSchema>;
export type RateOutletInput = z.infer<typeof rateOutletInputSchema>;
