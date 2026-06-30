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
  cuisineType: z.string().min(1),
  description: z.string().nullable(),
  imageUrl: z.url().nullable(),
  isOnline: z.boolean(),
  momentSubaccountCode: z.string(),
});

export const userProfileSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: z.string(),
  outletId: z.uuid().nullable(),
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
  orderId: z.uuid(),
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

export const adminOverviewSchema = z.object({
  generatedAt: z.iso.datetime(),
  activeOutlets: z.int().nonnegative(),
  openMasterOrders: z.int().nonnegative(),
  delayedSubOrders: z.int().nonnegative(),
  pendingSettlements: moneySchema,
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
export type ResendVerificationCodeInput = z.infer<typeof resendVerificationCodeInputSchema>;
export type ResendVerificationCodeResult = z.infer<typeof resendVerificationCodeResultSchema>;
export type OutletSummary = z.infer<typeof outletSummarySchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type UpdateMenuItemAvailabilityInput = z.infer<typeof updateMenuItemAvailabilityInputSchema>;
export type MasterOrderStatus = z.infer<typeof masterOrderStatusSchema>;
export type SubOrderStatus = z.infer<typeof subOrderStatusSchema>;
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
export type CreateDeliveryAddressInput = z.infer<typeof createDeliveryAddressInputSchema>;
export type DeliveryAddressSummary = z.infer<typeof deliveryAddressSummarySchema>;
export type ValidateAddressInput = z.infer<typeof validateAddressInputSchema>;
export type ValidateAddressResult = z.infer<typeof validateAddressResultSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
export type ChangePasswordResult = z.infer<typeof changePasswordResultSchema>;
export type InitiatePaymentInput = z.infer<typeof initiatePaymentInputSchema>;
export type InitiatePaymentResult = z.infer<typeof initiatePaymentResultSchema>;
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export type MenuCategorySummary = z.infer<typeof menuCategorySchema>;
export type MenuItemSummary = z.infer<typeof menuItemSchema>;
