import { describe, expect, it } from "vitest";

import {
  adminResultSchema,
  adminOrdersQuerySchema,
  adminOrdersResultSchema,
  createAdminInputSchema,
  customerOrderSchema,
  initiatePaymentInputSchema,
  loginInputSchema,
  menuItemsPageSchema,
  loginResultSchema,
  refreshSessionResultSchema,
  menuItemSchema,
  moneySchema,
  orderDetailSchema,
  outletSummarySchema,
  operationsQueueSchema,
  operationsSummarySchema,
  orderPulseSchema,
  outletSettlementExportSchema,
  outletSettlementSummarySchema,
  paginatedAuditLogsSchema,
  platformChargesSchema,
  profileUpdateResultSchema,
  rateMenuItemInputSchema,
  registrationResponseSchema,
  registerCustomerInputSchema,
  registrationResultSchema,
  resendVerificationCodeInputSchema,
  resendVerificationCodeResultSchema,
  riderLocationSchema,
  userVerificationResultSchema,
  updateMenuItemAvailabilityInputSchema,
  updatePlatformChargesInputSchema,
  uploadedImageSchema,
  userProfileSchema,
  verifyProfileChangeInputSchema,
  verifyUserInputSchema,
} from "./index";

describe("moneySchema", () => {
  it("accepts non-negative NGN minor units", () => {
    expect(moneySchema.parse({ amountMinor: 125050, currency: "NGN" })).toEqual({
      amountMinor: 125050,
      currency: "NGN",
    });
  });

  it("rejects decimal minor units", () => {
    expect(() => moneySchema.parse({ amountMinor: 12.5, currency: "NGN" })).toThrow();
  });
});

describe("platform charges contracts", () => {
  it("documents platform charge responses and partial updates", () => {
    expect(
      platformChargesSchema.parse({
        platformCommissionBps: 1500,
        defaultVatBps: 750,
        deliveryFeeMinor: 150000,
        serviceFeeMinor: 5000,
        currency: "NGN",
      }),
    ).toEqual({
      platformCommissionBps: 1500,
      defaultVatBps: 750,
      deliveryFeeMinor: 150000,
      serviceFeeMinor: 5000,
      currency: "NGN",
    });

    expect(updatePlatformChargesInputSchema.parse({ serviceFeeMinor: 0 })).toEqual({
      serviceFeeMinor: 0,
    });
  });

  it("rejects percentages above 100 percent and unknown update fields", () => {
    expect(() =>
      updatePlatformChargesInputSchema.parse({ platformCommissionBps: 10_001 }),
    ).toThrow();
    expect(() => updatePlatformChargesInputSchema.parse({ currency: "NGN" })).toThrow();
  });
});

describe("payment contracts", () => {
  it("accepts an optional mobile return URL on payment initiation", () => {
    expect(
      initiatePaymentInputSchema.parse({
        items: [
          {
            menuItemId: "45ef3252-b96f-4308-b40e-391623b25ac9",
            quantity: 1,
            modifiers: [],
          },
        ],
        deliveryMode: "DELIVERY",
        deliveryAddress: "12 Admiralty Way",
        deliveryLatitude: 6.4474,
        deliveryLongitude: 3.4542,
        subtotalMinor: 660000,
        deliveryFeeMinor: 150000,
        serviceFeeMinor: 0,
        vatMinor: 49500,
        platformCommissionMinor: 66000,
        totalMinor: 925500,
        returnUrl: "rsc://payment/return",
      }),
    ).toEqual({
      items: [
        {
          menuItemId: "45ef3252-b96f-4308-b40e-391623b25ac9",
          quantity: 1,
          modifiers: [],
        },
      ],
      deliveryMode: "DELIVERY",
      deliveryAddress: "12 Admiralty Way",
      deliveryLatitude: 6.4474,
      deliveryLongitude: 3.4542,
      subtotalMinor: 660000,
      deliveryFeeMinor: 150000,
      serviceFeeMinor: 0,
      vatMinor: 49500,
      platformCommissionMinor: 66000,
      totalMinor: 925500,
      returnUrl: "rsc://payment/return",
    });
  });
});

describe("media contracts", () => {
  it("documents uploaded image responses", () => {
    expect(
      uploadedImageSchema.parse({
        url: "https://res.cloudinary.com/rsc/image/upload/menu/item.webp",
        publicId: "uploads/menu-item",
      }),
    ).toEqual({
      url: "https://res.cloudinary.com/rsc/image/upload/menu/item.webp",
      publicId: "uploads/menu-item",
    });
  });

  it("documents nullable customer profile avatars", () => {
    expect(
      userProfileSchema.parse({
        id: "2abf9577-027c-4936-83a8-e004fd56a46e",
        name: "Ada Okafor",
        role: "CUSTOMER",
        outletId: null,
        avatarUrl: "https://res.cloudinary.com/rsc/image/upload/user-avatars/ada.webp",
        email: "ada@example.com",
        phone: "+2348031234567",
        verificationChannels: { email: true, phone: true },
        pendingVerificationChannels: { email: false, phone: false },
      }),
    ).toMatchObject({
      avatarUrl: "https://res.cloudinary.com/rsc/image/upload/user-avatars/ada.webp",
    });
  });

  it("documents pending profile updates and their six-digit verification input", () => {
    expect(
      profileUpdateResultSchema.parse({
        id: "2abf9577-027c-4936-83a8-e004fd56a46e",
        name: "Ada Okafor",
        role: "CUSTOMER",
        outletId: null,
        avatarUrl: null,
        email: "ada@example.com",
        phone: "+2348031234567",
        verificationChannels: { email: true, phone: true },
        pendingVerificationChannels: { email: true, phone: false },
        otpExpiresInSeconds: 600,
      }),
    ).toMatchObject({
      pendingVerificationChannels: { email: true, phone: false },
      otpExpiresInSeconds: 600,
    });
    expect(verifyProfileChangeInputSchema.parse({ code: "482901" })).toEqual({
      code: "482901",
    });
    expect(() => verifyProfileChangeInputSchema.parse({ code: "12345" })).toThrow();
  });
});

describe("menu item discounts", () => {
  it("falls back to the regular price for older menu-item responses", () => {
    const item = menuItemSchema.parse({
      id: "45ef3252-b96f-4308-b40e-391623b25ac9",
      outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
      categoryId: "35df7fe2-f6cd-483e-a0a2-b2331c4f4fb9",
      name: "Jollof Rice",
      description: null,
      imageUrl: null,
      priceMinor: 450000,
      currency: "NGN",
      isAvailable: true,
      sortOrder: 0,
      createdAt: "2026-07-27T08:00:00.000Z",
      updatedAt: "2026-07-27T08:00:00.000Z",
      deletedAt: null,
    });

    expect(item).toMatchObject({
      priceMinor: 450000,
      currentPriceMinor: 450000,
      discountPriceMinor: null,
      isDiscountActive: false,
    });
  });
});

describe("menu item rating contracts", () => {
  it("accepts one-to-five stars with an optional comment", () => {
    expect(rateMenuItemInputSchema.parse({ rating: 5, comment: "Loved it" })).toEqual({
      rating: 5,
      comment: "Loved it",
    });
    expect(() => rateMenuItemInputSchema.parse({ rating: 0 })).toThrow();
    expect(() => rateMenuItemInputSchema.parse({ rating: 6 })).toThrow();
  });
});

describe("operations stats contracts", () => {
  it("documents the operations summary", () => {
    expect(
      operationsSummarySchema.parse({
        activeOutlets: 4,
        openMasterOrders: 17,
        delayedSubOrders: 2,
        pendingSettlements: 5,
      }),
    ).toEqual({
      activeOutlets: 4,
      openMasterOrders: 17,
      delayedSubOrders: 2,
      pendingSettlements: 5,
    });
  });

  it("documents order pulse and queue responses", () => {
    expect(
      orderPulseSchema.parse({
        range: "TODAY",
        outletId: null,
        points: [
          {
            bucketStart: "2026-07-04T12:00:00.000Z",
            label: "12 PM",
            orderCount: 8,
          },
        ],
      }),
    ).toBeTruthy();
    expect(
      operationsQueueSchema.parse({
        outletId: null,
        delayedKitchenTickets: 2,
        oldestDelayMinutes: 19,
        pausedOutlets: 1,
        items: [
          {
            type: "DELAYED_KITCHEN_TICKETS",
            count: 2,
            oldestDelayMinutes: 19,
          },
          { type: "PAUSED_OUTLETS", count: 1 },
        ],
      }),
    ).toBeTruthy();
  });
});

describe("audit log contracts", () => {
  it("documents paginated audit log responses", () => {
    expect(
      paginatedAuditLogsSchema.parse({
        auditLogs: [
          {
            id: "45ef3252-b96f-4308-b40e-391623b25ac9",
            actorId: "2abf9577-027c-4936-83a8-e004fd56a46e",
            actorRole: "SUPER_ADMIN",
            action: "PATCH /api/v1/users/riders/721da55a-e320-410e-a22a-f88fb66d6d45",
            method: "PATCH",
            path: "/api/v1/users/riders/721da55a-e320-410e-a22a-f88fb66d6d45",
            statusCode: 200,
            resourceType: "users",
            resourceId: "721da55a-e320-410e-a22a-f88fb66d6d45",
            requestId: "request-1",
            ipAddress: "127.0.0.1",
            userAgent: "Vitest",
            metadata: { body: { phone: "[REDACTED]" } },
            createdAt: "2026-07-18T19:00:00.000Z",
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
        next: null,
        previous: null,
        hasNext: false,
        hasPrevious: false,
      }),
    ).toMatchObject({
      total: 1,
      auditLogs: [expect.objectContaining({ resourceType: "users" })],
    });
  });
});

describe("customer tracking contracts", () => {
  const order = {
    id: "2abf9577-027c-4936-83a8-e004fd56a46e",
    customerId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
    riderId: null,
    status: "AWAITING_HANDOFF",
    subtotalMinor: "100000",
    totalMinor: "100000",
    deliveryMode: "DELIVERY",
    deliveryAddress: null,
    deliveryLatitude: null,
    deliveryLongitude: null,
    paymentReference: null,
    deliveryCode: null,
    createdAt: "2026-07-04T10:00:00.000Z",
    updatedAt: "2026-07-04T10:00:00.000Z",
    deletedAt: null,
    futureField: true,
  };

  it("accepts nullable delivery fields, numeric strings, and future statuses", () => {
    expect(customerOrderSchema.parse(order)).toMatchObject({
      status: "AWAITING_HANDOFF",
      subtotalMinor: 100000,
      deliveryFeeMinor: 0,
      paymentReference: null,
      deliveryCode: null,
      futureField: true,
    });
  });

  it("normalizes missing order-detail collections", () => {
    expect(
      orderDetailSchema.parse({
        order,
        latestRiderLocation: null,
      }),
    ).toMatchObject({
      subOrders: [],
      lineItems: [],
      events: [],
      latestRiderLocation: null,
    });
  });

  it("rejects invalid rider coordinates", () => {
    expect(() =>
      riderLocationSchema.parse({
        riderId: null,
        masterOrderId: order.id,
        latitude: 120,
        longitude: 3.3792,
        recordedAt: "2026-07-04T10:00:00.000Z",
      }),
    ).toThrow();
  });
});

describe("customer registration contracts", () => {
  it("normalizes a valid registration request", () => {
    expect(
      registerCustomerInputSchema.parse({
        name: "  Ada Okafor  ",
        phone: " 08031234567 ",
        email: " ADA@EXAMPLE.COM ",
        password: "SecureP@ss1",
      }),
    ).toEqual({
      name: "Ada Okafor",
      phone: "08031234567",
      email: "ada@example.com",
      password: "SecureP@ss1",
    });
  });

  it("requires a password of at least 8 characters", () => {
    expect(() =>
      registerCustomerInputSchema.parse({
        name: "Ada Okafor",
        phone: "08031234567",
        email: "ada@example.com",
        password: "Abc123",
      }),
    ).toThrow();
  });

  it("rejects extra registration fields", () => {
    expect(() =>
      registerCustomerInputSchema.parse({
        name: "Ada Okafor",
        phone: "08031234567",
        email: "ada@example.com",
        password: "SecureP@ss1",
        role: "SUPER_ADMIN",
      }),
    ).toThrow();
  });

  it("documents both registration responses", () => {
    expect(
      registrationResultSchema.parse({
        customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
        status: "UNVERIFIED",
        otpExpiresInSeconds: 600,
        verificationChannels: { email: false, phone: false },
      }),
    ).toBeTruthy();
    expect(
      registrationResponseSchema.parse({
        data: {
          customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
          status: "UNVERIFIED",
          otpExpiresInSeconds: 600,
          verificationChannels: { email: false, phone: false },
        },
        message: "Customer registered; verification codes sent",
        status: 201,
      }),
    ).toBeTruthy();
    expect(
      userVerificationResultSchema.parse({
        customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
        status: "ACTIVE",
        channel: "email",
        verifiedAt: "2026-06-23T10:00:00.000Z",
        verificationChannels: { email: true, phone: false },
      }),
    ).toBeTruthy();
  });

  it("requires a six-digit verification code", () => {
    expect(() =>
      verifyUserInputSchema.parse({ channel: "phone", phone: "08031234567", code: "12345" }),
    ).toThrow();
    expect(() =>
      verifyUserInputSchema.parse({ channel: "email", email: "ada@example.com", code: "12345" }),
    ).toThrow();
  });

  it("requires the identifier that matches the verification channel", () => {
    expect(() =>
      verifyUserInputSchema.parse({ channel: "phone", email: "ada@example.com", code: "123456" }),
    ).toThrow();
    expect(() =>
      verifyUserInputSchema.parse({ channel: "email", phone: "08031234567", code: "123456" }),
    ).toThrow();
  });

  it("documents resend verification code contracts", () => {
    expect(
      resendVerificationCodeInputSchema.parse({
        channel: "email",
        email: " ADA@EXAMPLE.COM ",
      }),
    ).toEqual({ channel: "email", email: "ada@example.com" });
    expect(
      resendVerificationCodeResultSchema.parse({
        sent: true,
        channel: "email",
        otpExpiresInSeconds: 600,
      }),
    ).toBeTruthy();
  });

  it("documents login contracts", () => {
    expect(
      loginInputSchema.parse({ identifier: " ADA@EXAMPLE.COM ", password: "SecureP@ss1" }),
    ).toEqual({ identifier: "ada@example.com", password: "SecureP@ss1" });
    expect(
      loginResultSchema.parse({
        user: {
          id: "2abf9577-027c-4936-83a8-e004fd56a46e",
          role: "CUSTOMER",
          outletId: null,
        },
        accessTokenExpiresInSeconds: 900,
        refreshTokenExpiresInSeconds: 604800,
      }),
    ).toBeTruthy();
    expect(
      refreshSessionResultSchema.parse({
        user: {
          id: "2abf9577-027c-4936-83a8-e004fd56a46e",
          role: "ADMIN",
          outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
        },
        accessTokenExpiresInSeconds: 900,
        refreshTokenExpiresInSeconds: 604800,
      }),
    ).toBeTruthy();
  });

  it("documents admin creation contracts", () => {
    expect(
      createAdminInputSchema.parse({
        name: "  Outlet Manager  ",
        email: " MANAGER@EXAMPLE.COM ",
        phone: "08031234567",
        outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
      }),
    ).toEqual({
      name: "Outlet Manager",
      email: "manager@example.com",
      phone: "08031234567",
      outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
    });
    expect(
      adminResultSchema.parse({
        id: "b709c9f9-7d01-4d84-90d6-50b0ad470bc5",
        name: "Outlet Manager",
        role: "ADMIN",
        outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
        temporaryPassword: "e9FPuxWz3zRaAa1!",
      }),
    ).toBeTruthy();
  });

  it("documents menu item availability contracts", () => {
    expect(updateMenuItemAvailabilityInputSchema.parse({ isAvailable: false })).toEqual({
      isAvailable: false,
    });
    expect(
      menuItemSchema.parse({
        id: "45ef3252-b96f-4308-b40e-391623b25ac9",
        outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
        categoryId: "35df7fe2-f6cd-483e-a0a2-b2331c4f4fb9",
        name: "Jollof Rice",
        description: null,
        imageUrl: null,
        priceMinor: 450000,
        currency: "NGN",
        isAvailable: true,
        sortOrder: 0,
        createdAt: "2026-06-23T10:00:00.000Z",
        updatedAt: "2026-06-23T10:00:00.000Z",
        deletedAt: null,
      }),
    ).toBeTruthy();
    expect(
      menuItemsPageSchema.parse({
        items: [
          {
            id: "45ef3252-b96f-4308-b40e-391623b25ac9",
            outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
            categoryId: "35df7fe2-f6cd-483e-a0a2-b2331c4f4fb9",
            name: "Jollof Rice",
            description: null,
            imageUrl: null,
            deliveryTimeRange: "25-35 mins",
            ratingAverage: 4.5,
            ratingCount: 10,
            priceMinor: 450000,
            currency: "NGN",
            isAvailable: true,
            sortOrder: 0,
            createdAt: "2026-06-23T10:00:00.000Z",
            updatedAt: "2026-06-23T10:00:00.000Z",
            deletedAt: null,
          },
        ],
        total: 25,
        limit: 10,
        offset: 10,
        hasMore: true,
      }),
    ).toBeTruthy();
  });

  it("normalizes outlet settlement subaccount response field", () => {
    const baseOutlet = {
      id: "4273e96c-2887-49a5-a6d5-269f007f04f0",
      name: "Salmas Grill",
      cuisineType: "Grill",
      description: null,
      imageUrl: null,
      isOnline: true,
      ratingAverage: "0.00",
      ratingCount: 0,
      menuCategories: [],
      menuItems: [],
      itemModifierGroups: [],
      itemModifiers: [],
      menuItemModifierGroups: [],
    };

    expect(
      outletSummarySchema.parse({
        ...baseOutlet,
        settlementSubaccountCode: "SETTLEMENT_SALMAS",
      }),
    ).toMatchObject({
      settlementSubaccountCode: "SETTLEMENT_SALMAS",
    });

    expect(outletSummarySchema.parse(baseOutlet)).toMatchObject({
      settlementSubaccountCode: null,
    });
  });

  it("documents outlet settlement summary and Moment export contracts", () => {
    expect(
      outletSettlementSummarySchema.parse({
        outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
        outletName: "Salmas Grill",
        imageUrl: null,
        subaccountCode: "LOCAL_ACCT_SALMAS",
        settlementDateFrom: "2026-07-11",
        settlementDateTo: "2026-07-11",
        completedSubOrders: 3,
        pendingSubOrders: 3,
        grossMinor: 5029600,
        commissionMinor: 251500,
        netMinor: 4778100,
        currency: "NGN",
        status: "PENDING",
        approvalAvailable: true,
        approvalUnavailableReason: null,
        latestApprovedAt: null,
      }),
    ).toBeTruthy();

    expect(
      outletSettlementExportSchema.parse({
        filename: "20260712_Moment_RSC_Settlement_batch_20260711.csv",
        contentType: "text/csv",
        content: "transaction_type,merchant_reference_id\nPayment,RSC-123",
      }),
    ).toBeTruthy();
  });

  it("defaults outlet relation arrays when create responses omit them", () => {
    expect(
      outletSummarySchema.parse({
        id: "4273e96c-2887-49a5-a6d5-269f007f04f0",
        name: "Manjaro",
        cuisineType: "Nigerian Locals",
        description: "For the foodies",
        imageUrl: null,
        isOnline: true,
        settlementSubaccountCode: "Manjaro_123ert",
      }),
    ).toMatchObject({
      menuCategories: [],
      menuItems: [],
      itemModifierGroups: [],
      itemModifiers: [],
      menuItemModifierGroups: [],
    });
  });

  it("documents admin order list contracts", () => {
    expect(
      adminOrdersQuerySchema.parse({
        outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
        status: "CONFIRMED",
        subOrderStatus: "PREPARING",
        deliveryMode: "DELIVERY",
        customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
        dateFrom: "2026-07-01T00:00:00.000Z",
        dateTo: "2026-07-02T23:59:59.000Z",
        limit: 50,
        offset: 0,
      }),
    ).toBeTruthy();
    expect(
      adminOrdersResultSchema.parse({
        orders: [
          {
            order: {
              id: "50296ef7-fb39-4b42-ae55-81caec8efd21",
              customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
              riderId: null,
              status: "CONFIRMED",
              subtotalMinor: 450000,
              deliveryFeeMinor: 100000,
              serviceFeeMinor: 0,
              vatMinor: 0,
              discountMinor: 0,
              totalMinor: 550000,
              currency: "NGN",
              deliveryMode: "DELIVERY",
              deliveryAddress: "12 Abakaliki Road, Enugu",
              deliveryLatitude: 6.4474,
              deliveryLongitude: 7.5139,
              paymentReference: "paystack-ref",
              deliveryCode: "123456",
              createdAt: "2026-07-02T08:00:00.000Z",
              updatedAt: "2026-07-02T08:00:00.000Z",
              deletedAt: null,
            },
            subOrders: [
              {
                id: "8f36ee26-6f25-47cf-aed7-26afcb6278fe",
                masterOrderId: "50296ef7-fb39-4b42-ae55-81caec8efd21",
                outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
                status: "PREPARING",
                subtotalMinor: 450000,
                commissionMinor: 45000,
                netMinor: 405000,
                currency: "NGN",
                createdAt: "2026-07-02T08:00:00.000Z",
                updatedAt: "2026-07-02T08:00:00.000Z",
                deletedAt: null,
              },
            ],
            lineItems: [
              {
                id: "b4eec994-872d-4915-9e12-b31947f96c3b",
                masterOrderId: "50296ef7-fb39-4b42-ae55-81caec8efd21",
                subOrderId: "8f36ee26-6f25-47cf-aed7-26afcb6278fe",
                outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
                menuItemId: "45ef3252-b96f-4308-b40e-391623b25ac9",
                itemNameSnapshot: "Jollof Rice",
                unitPriceMinor: 450000,
                quantity: 1,
                lineTotalMinor: 450000,
                currency: "NGN",
                modifiersSnapshot: [],
                createdAt: "2026-07-02T08:00:00.000Z",
                updatedAt: "2026-07-02T08:00:00.000Z",
                deletedAt: null,
              },
            ],
          },
        ],
        total: 1,
        totalSubOrders: 1,
        limit: 50,
        offset: 0,
        next: null,
        previous: null,
        hasNext: false,
        hasPrevious: false,
      }),
    ).toBeTruthy();
  });
});
