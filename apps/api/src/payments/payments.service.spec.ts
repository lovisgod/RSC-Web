import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { DataSource, Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Customer } from "../auth/customer.entity";
import { UserRole } from "../auth/user-role.enum";
import type { PiiCryptoService } from "../common/security/pii-crypto.service";
import type { ApplicationConfig } from "../config/configuration";
import type { DeliveryService } from "../delivery/delivery.service";
import type { ItemModifier } from "../catalog/item-modifier.entity";
import { MenuItem } from "../catalog/menu-item.entity";
import { MasterOrder } from "../orders/master-order.entity";
import type { OrderLineItem } from "../orders/order-line-item.entity";
import { MasterOrderStatus, SubOrderStatus } from "../orders/order-status.enum";
import { SubOrder } from "../orders/sub-order.entity";
import { Outlet } from "../outlets/outlet.entity";
import type { Promo } from "../notifications/promo.entity";
import type { NotificationsService } from "../notifications/notifications.service";
import type { RealtimeNotificationEvent, RealtimeService } from "../realtime/realtime.service";
import type { Payment } from "./payment.entity";
import { PaymentStatus } from "./payment.entity";
import type {
  InitiateProviderPaymentInput,
  InitiateProviderPaymentResult,
  PaymentAdapter,
  RefundProviderPaymentInput,
  RefundProviderPaymentResult,
} from "./payment-adapter";
import { PaymentRefund } from "./payment-refund.entity";
import { PaymentsService } from "./payments.service";

describe(PaymentsService.name, () => {
  const customerId = "2abf9577-027c-4936-83a8-e004fd56a46e";
  const outletId = "4273e96c-2887-49a5-a6d5-269f007f04f0";
  let service: PaymentsService;
  let users: { find: ReturnType<typeof vi.fn>; findOneBy: ReturnType<typeof vi.fn> };
  let menuItems: { findBy: ReturnType<typeof vi.fn> };
  let modifiers: { findBy: ReturnType<typeof vi.fn> };
  let outlets: { findBy: ReturnType<typeof vi.fn> };
  let masterOrders: { findOneBy: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };
  let subOrders: { find: ReturnType<typeof vi.fn> };
  let lineItems: { find: ReturnType<typeof vi.fn> };
  let payments: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let refunds: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let promos: { findOneBy: ReturnType<typeof vi.fn> };
  let dataSource: { query: ReturnType<typeof vi.fn>; transaction: ReturnType<typeof vi.fn> };
  let delivery: { validateAddress: ReturnType<typeof vi.fn> };
  let paymentAdapter: PaymentAdapter;
  let initiatePayment: ReturnType<
    typeof vi.fn<(input: InitiateProviderPaymentInput) => Promise<InitiateProviderPaymentResult>>
  >;
  let refundPayment: ReturnType<
    typeof vi.fn<(input: RefundProviderPaymentInput) => Promise<RefundProviderPaymentResult>>
  >;
  let realtime: {
    emitSuborderNew: ReturnType<typeof vi.fn>;
    emitSuborderConfirmed: ReturnType<typeof vi.fn>;
    emitOrderStatusUpdate: ReturnType<typeof vi.fn>;
    emitAdminNotification: ReturnType<typeof vi.fn>;
  };
  let notifications: {
    createAndPush: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    users = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue({
        id: customerId,
        emailEncrypted: "encrypted:ada@example.com",
      }),
    };
    menuItems = {
      findBy: vi.fn().mockResolvedValue([
        Object.assign(new MenuItem(), {
          id: "45ef3252-b96f-4308-b40e-391623b25ac9",
          outletId,
          name: "Jollof Rice",
          priceMinor: 450000,
          isAvailable: true,
        }),
      ]),
    };
    modifiers = { findBy: vi.fn().mockResolvedValue([]) };
    outlets = {
      findBy: vi.fn().mockResolvedValue([
        Object.assign(new Outlet(), {
          id: outletId,
          name: "Lekki Kitchen",
          latitude: 6.4474,
          longitude: 3.4542,
          deliveryRadiusKm: 15,
          isOnline: true,
          vatBps: 0,
          settlementSubaccountCode: "MOMENT_LEKKI",
        }),
      ]),
    };
    masterOrders = {
      findOneBy: vi.fn().mockResolvedValue(null),
      save: vi.fn((value: MasterOrder) => Promise.resolve(value)),
    };
    subOrders = {
      find: vi.fn().mockResolvedValue([]),
    };
    lineItems = {
      find: vi.fn().mockResolvedValue([]),
    };
    payments = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue({
        id: "f5e8f6ff-e76c-4ef4-8dd2-9ef601bd9705",
        masterOrderId: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
        amountMinor: 645000,
        currency: "NGN",
        gateway: "local",
        reference: "RSC-reference",
        status: PaymentStatus.SUCCESS,
      }),
      update: vi.fn().mockResolvedValue({ affected: 0 }),
      create: vi.fn((value: Partial<Payment>) => value),
      save: vi.fn((value: Partial<Payment>) =>
        Promise.resolve({
          id: "a933abfc-ee1d-4267-8b1b-20b7106c1c2d",
          ...value,
        }),
      ),
    };
    refunds = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue(null),
      createQueryBuilder: vi.fn(),
      create: vi.fn((value: Partial<PaymentRefund>) => value),
      save: vi.fn((value: Partial<PaymentRefund>) =>
        Promise.resolve({
          id: "2d314436-919a-4873-ad0f-92d8d79ce448",
          createdAt: new Date("2026-07-12T12:00:00.000Z"),
          ...value,
        }),
      ),
    };
    promos = { findOneBy: vi.fn().mockResolvedValue(null) };
    dataSource = { query: vi.fn().mockResolvedValue([]), transaction: vi.fn() };
    delivery = {
      validateAddress: vi.fn().mockResolvedValue({
        deliverable: true,
        zone: { id: "lagos-expanded", name: "Lagos Island Expanded Delivery Zone" },
      }),
    };
    refundPayment = vi
      .fn<(input: RefundProviderPaymentInput) => Promise<RefundProviderPaymentResult>>()
      .mockResolvedValue({
        providerRefundId: "local_refund_RSC-reference",
        status: "SUCCESS",
        providerResponse: {},
      });
    initiatePayment = vi.fn().mockResolvedValue({
      gateway: "local",
      reference: "RSC-reference",
      status: "SUCCESS",
      checkoutUrl: null,
      providerResponse: {},
    });
    paymentAdapter = {
      initiate: initiatePayment,
      verify: vi.fn().mockResolvedValue({
        status: "SUCCESS",
        amountMinor: 0,
        reference: "RSC-reference",
        providerResponse: {},
      }),
      parseWebhookEvent: vi.fn().mockResolvedValue(null),
      provisionSubaccount: vi
        .fn()
        .mockResolvedValue({ subaccountCode: "LOCAL_ACCT_TEST", providerResponse: {} }),
      refund: refundPayment,
    };
    realtime = {
      emitSuborderNew: vi.fn(),
      emitSuborderConfirmed: vi.fn(),
      emitOrderStatusUpdate: vi.fn(),
      emitAdminNotification: vi.fn(),
    };
    notifications = {
      createAndPush: vi.fn().mockImplementation((input: Record<string, unknown>) =>
        Promise.resolve({
          id: "0d8f7999-22c9-42da-a3f7-87cccf971e2d",
          createdAt: new Date("2026-07-15T12:00:00.000Z"),
          ...input,
        }),
      ),
    };

    service = new PaymentsService(
      users as unknown as Repository<Customer>,
      menuItems as unknown as Repository<MenuItem>,
      modifiers as unknown as Repository<ItemModifier>,
      outlets as unknown as Repository<Outlet>,
      masterOrders as unknown as Repository<MasterOrder>,
      subOrders as unknown as Repository<SubOrder>,
      lineItems as unknown as Repository<OrderLineItem>,
      payments as unknown as Repository<Payment>,
      refunds as unknown as Repository<PaymentRefund>,
      promos as unknown as Repository<Promo>,
      dataSource as unknown as DataSource,
      delivery as unknown as DeliveryService,
      {
        decrypt: vi.fn((value: string) => value.replace(/^encrypted:/, "")),
      } as unknown as PiiCryptoService,
      {
        get: vi.fn().mockReturnValue({
          platformCommissionBps: 1000,
          vatBps: 750,
          deliveryFeeMinor: 150000,
        }),
      } as unknown as ConfigService<ApplicationConfig, true>,
      paymentAdapter,
      realtime as unknown as RealtimeService,
      notifications as unknown as NotificationsService,
    );
  });

  it("blocks delivery checkout when the address is outside the cart outlet radius", async () => {
    await expect(
      service.initiate(
        {
          id: customerId,
          role: UserRole.CUSTOMER,
          sessionId: "session-1",
          accessTokenId: "access-token-1",
        },
        {
          deliveryMode: "DELIVERY",
          deliveryAddress: "Independence Layout, Enugu",
          deliveryLatitude: 6.5244,
          deliveryLongitude: 7.5103,
          items: [
            {
              menuItemId: "45ef3252-b96f-4308-b40e-391623b25ac9",
              quantity: 1,
            },
          ],
          subtotalMinor: 450000,
          deliveryFeeMinor: 150000,
          serviceFeeMinor: 0,
          vatMinor: 0,
          platformCommissionMinor: 45000,
          totalMinor: 645000,
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it("uses platform default VAT when outlet VAT is unset for the provider payment amount", async () => {
    menuItems.findBy.mockResolvedValue([
      Object.assign(new MenuItem(), {
        id: "45ef3252-b96f-4308-b40e-391623b25ac9",
        outletId,
        name: "Fried Rice Combo",
        priceMinor: 660000,
        isAvailable: true,
      }),
    ]);
    outlets.findBy.mockResolvedValue([
      Object.assign(new Outlet(), {
        id: outletId,
        name: "Salmas Grill",
        latitude: 6.4474,
        longitude: 3.4542,
        deliveryRadiusKm: 15,
        isOnline: true,
        vatBps: 0,
        settlementSubaccountCode: "salmas_423fsdz432",
      }),
    ]);
    dataSource.transaction.mockImplementation((callback: (manager: unknown) => unknown) =>
      callback({
        create: vi.fn((_entity: unknown, value: unknown) => value),
        save: vi.fn((value: Record<string, unknown>) =>
          Promise.resolve({
            id: "45ef3252-b96f-4308-b40e-391623b25ac9",
            reference: "RSC-reference",
            checkoutUrl: "https://moment.example/checkout",
            ...value,
          }),
        ),
      }),
    );

    await service.initiate(
      { id: customerId, role: UserRole.CUSTOMER, sessionId: "s1", accessTokenId: "a1" },
      {
        deliveryMode: "DELIVERY",
        deliveryAddress: "12 Admiralty Way",
        deliveryLatitude: 6.4474,
        deliveryLongitude: 3.4542,
        items: [{ menuItemId: "45ef3252-b96f-4308-b40e-391623b25ac9", quantity: 1 }],
        subtotalMinor: 660000,
        deliveryFeeMinor: 150000,
        serviceFeeMinor: 0,
        vatMinor: 49500,
        platformCommissionMinor: 66000,
        totalMinor: 925500,
        returnUrl: "rsc://payment/return",
      },
    );

    expect(initiatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 925500,
        returnUrl: "rsc://payment/return",
      }),
    );
  });

  it("applies an active order promo before initiating provider payment", async () => {
    promos.findOneBy.mockResolvedValueOnce({
      code: "SAVE20",
      title: "Save 20",
      body: "20% off",
      discountTarget: "ORDER",
      discountPercent: 20,
      scope: "ALL_OUTLETS",
      outletId: null,
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      endsAt: new Date("2099-07-31T23:59:59.000Z"),
      isActive: true,
    });
    dataSource.transaction.mockImplementation((callback: (manager: unknown) => unknown) =>
      callback({
        create: vi.fn((_entity: unknown, value: unknown) => value),
        save: vi.fn((value: Record<string, unknown>) =>
          Promise.resolve({
            id: "45ef3252-b96f-4308-b40e-391623b25ac9",
            reference: "RSC-reference",
            checkoutUrl: "https://moment.example/checkout",
            ...value,
          }),
        ),
      }),
    );

    await service.initiate(
      { id: customerId, role: UserRole.CUSTOMER, sessionId: "s1", accessTokenId: "a1" },
      {
        deliveryMode: "DELIVERY",
        deliveryAddress: "12 Admiralty Way",
        deliveryLatitude: 6.4474,
        deliveryLongitude: 3.4542,
        items: [{ menuItemId: "45ef3252-b96f-4308-b40e-391623b25ac9", quantity: 1 }],
        promoCode: "save20",
        subtotalMinor: 450000,
        deliveryFeeMinor: 150000,
        serviceFeeMinor: 0,
        vatMinor: 33750,
        discountMinor: 90000,
        platformCommissionMinor: 45000,
        totalMinor: 588750,
      },
    );

    expect(initiatePayment).toHaveBeenCalledWith(expect.objectContaining({ amountMinor: 588750 }));
  });

  it("accepts the pre-discount checkout total when a valid promo is applied", async () => {
    promos.findOneBy.mockResolvedValueOnce({
      code: "HALF",
      title: "Half off",
      body: "50% off",
      discountTarget: "ORDER",
      discountPercent: 50,
      scope: "ALL_OUTLETS",
      outletId: null,
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      endsAt: new Date("2099-07-31T23:59:59.000Z"),
      isActive: true,
    });
    dataSource.transaction.mockImplementation((callback: (manager: unknown) => unknown) =>
      callback({
        create: vi.fn((_entity: unknown, value: unknown) => value),
        save: vi.fn((value: Record<string, unknown>) =>
          Promise.resolve({
            id: "45ef3252-b96f-4308-b40e-391623b25ac9",
            reference: "RSC-reference",
            checkoutUrl: "https://moment.example/checkout",
            ...value,
          }),
        ),
      }),
    );

    await service.initiate(
      { id: customerId, role: UserRole.CUSTOMER, sessionId: "s1", accessTokenId: "a1" },
      {
        deliveryMode: "DELIVERY",
        deliveryAddress: "12 Admiralty Way",
        deliveryLatitude: 6.4474,
        deliveryLongitude: 3.4542,
        items: [{ menuItemId: "45ef3252-b96f-4308-b40e-391623b25ac9", quantity: 1 }],
        promoCode: "half",
        subtotalMinor: 450000,
        deliveryFeeMinor: 150000,
        serviceFeeMinor: 0,
        vatMinor: 33750,
        platformCommissionMinor: 45000,
        totalMinor: 678750,
      },
    );

    expect(initiatePayment).toHaveBeenCalledWith(expect.objectContaining({ amountMinor: 453750 }));
  });

  it("processes a super admin refund for a successful payment", async () => {
    const result = await service.processRefund(
      {
        id: "46a60575-b4aa-40d7-a9de-b1af448263fe",
        role: UserRole.SUPER_ADMIN,
        sessionId: "session-1",
        accessTokenId: "access-token-1",
      },
      "RSC-reference",
      { amountMinor: 250000, reason: "Customer cancellation" },
    );

    expect(refundPayment).toHaveBeenCalledWith({
      reference: "RSC-reference",
      amountMinor: 250000,
      currency: "NGN",
      reason: "Customer cancellation",
    });
    expect(refunds.save).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "f5e8f6ff-e76c-4ef4-8dd2-9ef601bd9705",
        amountMinor: 250000,
        reason: "Customer cancellation",
        provider: "local",
        requestedBy: "46a60575-b4aa-40d7-a9de-b1af448263fe",
      }),
    );
    expect(result).toEqual(expect.objectContaining({ status: "SUCCESS", amountMinor: 250000 }));
  });

  it("lists refund requests with payment and order context for super admins", async () => {
    const refund = Object.assign(new PaymentRefund(), {
      id: "2d314436-919a-4873-ad0f-92d8d79ce448",
      paymentId: "f5e8f6ff-e76c-4ef4-8dd2-9ef601bd9705",
      reference: "RSC-reference",
      amountMinor: 250000,
      currency: "NGN" as const,
      status: "PENDING" as const,
      reason: "Order issue",
      provider: "local",
      providerRefundId: null,
      requestedBy: customerId,
      providerResponse: null,
      createdAt: new Date("2026-07-15T12:00:00.000Z"),
    });
    const queryBuilder = {
      leftJoin: vi.fn(() => queryBuilder),
      addSelect: vi.fn(() => queryBuilder),
      orderBy: vi.fn(() => queryBuilder),
      andWhere: vi.fn(() => queryBuilder),
      take: vi.fn(() => queryBuilder),
      skip: vi.fn(() => queryBuilder),
      getCount: vi.fn().mockResolvedValue(2),
      getRawAndEntities: vi.fn().mockResolvedValue({
        entities: [refund],
        raw: [
          {
            payment_id: refund.paymentId,
            payment_master_order_id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
            payment_amount_minor: 645000,
            payment_currency: "NGN",
            payment_gateway: "local",
            payment_reference: "RSC-reference",
            payment_status: PaymentStatus.SUCCESS,
            payment_created_at: new Date("2026-07-15T11:00:00.000Z"),
            order_id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
            order_customer_id: customerId,
            order_status: MasterOrderStatus.CONFIRMED,
            order_total_minor: 645000,
            order_currency: "NGN",
            order_created_at: new Date("2026-07-15T10:00:00.000Z"),
            customer_id: customerId,
            customer_name: "Ada Customer",
            requester_id: customerId,
            requester_name: "Ada Customer",
            requester_role: UserRole.CUSTOMER,
          },
        ],
      }),
    };
    refunds.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.listRefundRequests({
      status: "PENDING",
      reference: "RSC",
      limit: 1,
      offset: 1,
    });

    expect(refunds.createQueryBuilder).toHaveBeenCalledWith("refund");
    expect(queryBuilder.andWhere).toHaveBeenCalledWith("refund.status = :status", {
      status: "PENDING",
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "(refund.reference ILIKE :reference OR payment.reference ILIKE :reference)",
      { reference: "%RSC%" },
    );
    expect(queryBuilder.take).toHaveBeenCalledWith(1);
    expect(queryBuilder.skip).toHaveBeenCalledWith(1);
    expect(result).toEqual({
      refundRequests: [
        expect.objectContaining({
          refund,
          payment: {
            id: refund.paymentId,
            masterOrderId: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
            amountMinor: 645000,
            currency: "NGN",
            gateway: "local",
            reference: "RSC-reference",
            status: PaymentStatus.SUCCESS,
            createdAt: new Date("2026-07-15T11:00:00.000Z"),
          },
          order: {
            id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
            customerId,
            status: MasterOrderStatus.CONFIRMED,
            totalMinor: 645000,
            currency: "NGN",
            createdAt: new Date("2026-07-15T10:00:00.000Z"),
          },
          customer: { id: customerId, name: "Ada Customer" },
          requestedBy: { id: customerId, name: "Ada Customer", role: UserRole.CUSTOMER },
        }),
      ],
      total: 2,
      limit: 1,
      offset: 1,
      next: null,
      previous: 0,
      hasNext: false,
      hasPrevious: true,
    });
  });

  it("records a pending customer refund request without calling the provider", async () => {
    masterOrders.findOneBy.mockResolvedValue(
      Object.assign(new MasterOrder(), {
        id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
        customerId,
      }),
    );

    const result = await service.requestRefund(
      {
        id: customerId,
        role: UserRole.CUSTOMER,
        sessionId: "session-1",
        accessTokenId: "access-token-1",
      },
      "RSC-reference",
      { amountMinor: 250000, reason: "Order issue" },
    );

    expect(refundPayment).not.toHaveBeenCalled();
    expect(refunds.save).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: "f5e8f6ff-e76c-4ef4-8dd2-9ef601bd9705",
        amountMinor: 250000,
        status: "PENDING",
        reason: "Order issue",
        provider: "local",
        providerRefundId: null,
        requestedBy: customerId,
        providerResponse: null,
      }),
    );
    expect(result).toEqual(expect.objectContaining({ status: "PENDING", amountMinor: 250000 }));
  });

  it("calculates customer refund amount from a rejected sub-order", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId,
      subtotalMinor: 100000,
      vatMinor: 7500,
      discountMinor: 0,
    });
    const rejectedSubOrder = Object.assign(new SubOrder(), {
      id: "0b8706a1-b1d9-4c05-860f-8e15f70410f2",
      masterOrderId: order.id,
      outletId,
      status: SubOrderStatus.REJECTED,
      subtotalMinor: 40000,
      commissionMinor: 4000,
    });
    masterOrders.findOneBy.mockResolvedValue(order);
    subOrders.find.mockResolvedValue([rejectedSubOrder]);

    await service.requestRefund(
      {
        id: customerId,
        role: UserRole.CUSTOMER,
        sessionId: "session-1",
        accessTokenId: "access-token-1",
      },
      "RSC-reference",
      { subOrderId: rejectedSubOrder.id, reason: "Outlet rejected this item" },
    );

    expect(refundPayment).not.toHaveBeenCalled();
    expect(refunds.save).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 47000,
        status: "PENDING",
        providerResponse: { requestedSubOrderId: rejectedSubOrder.id },
      }),
    );
  });

  it("does not allow a customer to submit another pending refund request for the same payment", async () => {
    masterOrders.findOneBy.mockResolvedValue(
      Object.assign(new MasterOrder(), {
        id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
        customerId,
      }),
    );
    refunds.findOne.mockResolvedValue(
      Object.assign(new PaymentRefund(), {
        id: "2d314436-919a-4873-ad0f-92d8d79ce448",
        paymentId: "f5e8f6ff-e76c-4ef4-8dd2-9ef601bd9705",
        requestedBy: customerId,
        status: "PENDING",
      }),
    );

    await expect(
      service.requestRefund(
        {
          id: customerId,
          role: UserRole.CUSTOMER,
          sessionId: "session-1",
          accessTokenId: "access-token-1",
        },
        "RSC-reference",
        { amountMinor: 250000, reason: "Order issue" },
      ),
    ).rejects.toThrow("A refund request is already pending for this payment");

    expect(refunds.save).not.toHaveBeenCalled();
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it("does not allow customers to request refunds for another customer's payment", async () => {
    masterOrders.findOneBy.mockResolvedValue(
      Object.assign(new MasterOrder(), {
        id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
        customerId: "8b060ba5-d7f1-4b25-85ec-c0d82df4c5ef",
      }),
    );

    await expect(
      service.requestRefund(
        {
          id: customerId,
          role: UserRole.CUSTOMER,
          sessionId: "session-1",
          accessTokenId: "access-token-1",
        },
        "RSC-reference",
        { reason: "Order issue" },
      ),
    ).rejects.toThrow("Payment not found");

    expect(refunds.save).not.toHaveBeenCalled();
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it("retries payment for the existing order without creating another order id", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId,
      riderId: null,
      status: MasterOrderStatus.CANCELLED,
      subtotalMinor: 450000,
      deliveryFeeMinor: 150000,
      serviceFeeMinor: 0,
      vatMinor: 33750,
      totalMinor: 678750,
      currency: "NGN" as const,
      paymentReference: "RSC-old-reference",
      updatedAt: new Date("2026-07-12T12:00:00.000Z"),
    });
    const subOrder = Object.assign(new SubOrder(), {
      id: "0b8706a1-b1d9-4c05-860f-8e15f70410f2",
      masterOrderId: order.id,
      outletId,
      subtotalMinor: 450000,
      commissionMinor: 45000,
      netMinor: 405000,
    });
    masterOrders.findOneBy.mockResolvedValue(order);
    subOrders.find.mockResolvedValue([subOrder]);
    payments.find.mockResolvedValue([
      {
        id: "958f43f6-75e1-4ee2-afd3-8d871832c589",
        masterOrderId: order.id,
        reference: "RSC-old-reference",
        status: PaymentStatus.FAILED,
      },
    ]);
    initiatePayment.mockResolvedValueOnce({
      gateway: "moment",
      reference: "RSC-new-reference",
      status: "PENDING",
      checkoutUrl: "https://momentpay.io/checkout/retry",
      providerResponse: { id: "provider-payment" },
    });

    const result = await service.retryOrderPayment(
      { id: customerId, role: UserRole.CUSTOMER, sessionId: "s1", accessTokenId: "a1" },
      order.id,
      { returnUrl: "rsc://payment/return" },
    );

    expect(initiatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 678750,
        currency: "NGN",
        email: "ada@example.com",
        returnUrl: "rsc://payment/return",
        splitRoutes: [
          {
            outletId,
            subaccountCode: "MOMENT_LEKKI",
            grossMinor: 450000,
            commissionMinor: 45000,
            netMinor: 405000,
          },
        ],
      }),
    );
    expect(payments.update).toHaveBeenCalledWith(
      { masterOrderId: order.id, status: PaymentStatus.PENDING },
      { status: PaymentStatus.FAILED },
    );
    expect(masterOrders.save).toHaveBeenCalledWith(order);
    expect(order.paymentReference).toBe("RSC-new-reference");
    expect(order.status).toBe(MasterOrderStatus.PENDING_PAYMENT);
    expect(result).toEqual(
      expect.objectContaining({
        masterOrderId: order.id,
        paymentId: "a933abfc-ee1d-4267-8b1b-20b7106c1c2d",
        reference: "RSC-new-reference",
        checkoutUrl: "https://momentpay.io/checkout/retry",
        status: PaymentStatus.PENDING,
      }),
    );
  });

  it("does not retry payment for an order that already has a successful payment", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId,
      status: MasterOrderStatus.CONFIRMED,
      totalMinor: 678750,
      currency: "NGN" as const,
    });
    masterOrders.findOneBy.mockResolvedValue(order);
    payments.find.mockResolvedValue([{ status: PaymentStatus.SUCCESS }]);

    await expect(
      service.retryOrderPayment(
        { id: customerId, role: UserRole.CUSTOMER, sessionId: "s1", accessTokenId: "a1" },
        order.id,
        {},
      ),
    ).rejects.toThrow(/already been paid/);

    expect(initiatePayment).not.toHaveBeenCalled();
  });

  it("notifies outlet and super admins in realtime when a pending payment succeeds", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId,
      riderId: null,
      status: MasterOrderStatus.PENDING_PAYMENT,
      updatedAt: new Date("2026-07-15T12:00:00.000Z"),
    });
    const payment = {
      id: "f5e8f6ff-e76c-4ef4-8dd2-9ef601bd9705",
      masterOrderId: order.id,
      amountMinor: 645000,
      currency: "NGN" as const,
      gateway: "local",
      reference: "RSC-reference",
      status: PaymentStatus.PENDING,
    };
    const outletAdmin = {
      id: "b709c9f9-7d01-4d84-90d6-50b0ad470bc5",
      role: UserRole.ADMIN,
      outletId,
    };
    const superAdmin = {
      id: "31a2df7e-7f2a-4433-9d5e-1caad0f91c4d",
      role: UserRole.SUPER_ADMIN,
      outletId: null,
    };
    payments.findOneBy.mockResolvedValue(payment);
    masterOrders.findOneBy.mockResolvedValue(order);
    const subOrder = Object.assign(new SubOrder(), {
      id: "0b8706a1-b1d9-4c05-860f-8e15f70410f2",
      masterOrderId: order.id,
      outletId,
    });
    const orderLineItem = {
      id: "db049a4a-5152-4e94-a34b-f0fcac5b1b2d",
      masterOrderId: order.id,
      subOrderId: subOrder.id,
      outletId,
    };
    subOrders.find.mockResolvedValue([subOrder]);
    lineItems.find.mockResolvedValue([orderLineItem]);
    users.find.mockResolvedValue([outletAdmin, superAdmin]);

    await service.confirmPayment({
      eventId: "evt-payment-success",
      eventType: "charge.success",
      reference: payment.reference,
      status: "SUCCESS",
      amountMinor: payment.amountMinor,
      providerResponse: {},
    });

    expect(notifications.createAndPush).toHaveBeenCalledTimes(2);
    expect(notifications.createAndPush).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: outletAdmin.id,
        recipientRole: UserRole.ADMIN,
        type: "PAYMENT_SUCCESS",
      }),
    );
    expect(notifications.createAndPush).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: superAdmin.id,
        recipientRole: UserRole.SUPER_ADMIN,
        type: "PAYMENT_SUCCESS",
      }),
    );
    expect(realtime.emitSuborderConfirmed).toHaveBeenCalledWith(
      expect.objectContaining({
        masterOrderId: order.id,
        subOrderId: subOrder.id,
        outletId,
        status: MasterOrderStatus.CONFIRMED,
        order,
        subOrder,
        lineItems: [expect.objectContaining({ subOrderId: subOrder.id })],
      }),
    );
    const notificationCall = realtime.emitAdminNotification.mock.calls.at(-1);
    const notificationEvent = notificationCall?.[0] as RealtimeNotificationEvent;
    const notificationOutletIds = notificationCall?.[1] as string[];
    expect(notificationEvent.type).toBe("PAYMENT_SUCCESS");
    expect(notificationEvent.data).toEqual(
      expect.objectContaining({
        masterOrderId: order.id,
        paymentId: payment.id,
        reference: payment.reference,
        outletIds: [outletId],
      }),
    );
    expect(notificationOutletIds).toEqual([outletId]);
  });

  it("stores recipient phone on the master order and preparation note on every sub-order", async () => {
    const savedMasterOrder = {
      id: "0c94477e-f55c-44db-b835-51b6d623aa46",
      customerId,
    };
    const savedSubOrder = {
      id: "0b8706a1-b1d9-4c05-860f-8e15f70410f2",
      outletId,
    };
    const savedPayment = {
      id: "958f43f6-75e1-4ee2-afd3-8d871832c589",
      reference: "RSC-reference",
      checkoutUrl: null,
      status: PaymentStatus.SUCCESS,
    };
    const manager = {
      create: vi.fn((_entity: unknown, value: unknown) => value),
      save: vi.fn((value: Record<string, unknown>) => {
        if ("paymentReference" in value) return Promise.resolve(savedMasterOrder);
        if ("pickupCode" in value) return Promise.resolve(savedSubOrder);
        if ("gateway" in value) return Promise.resolve(savedPayment);
        return Promise.resolve(value);
      }),
    };
    type MockTransactionManager = typeof manager;
    dataSource.transaction.mockImplementation(
      (callback: (manager: MockTransactionManager) => unknown) => callback(manager),
    );

    await service.initiate(
      {
        id: customerId,
        role: UserRole.CUSTOMER,
        sessionId: "session-1",
        accessTokenId: "access-token-1",
      },
      {
        deliveryMode: "DELIVERY",
        deliveryAddress: "12 Admiralty Way",
        deliveryLatitude: 6.4474,
        deliveryLongitude: 3.4542,
        recipientPhone: "08031234567",
        preparationNote: "No onions across the order",
        items: [
          {
            menuItemId: "45ef3252-b96f-4308-b40e-391623b25ac9",
            quantity: 1,
          },
        ],
        subtotalMinor: 450000,
        deliveryFeeMinor: 150000,
        serviceFeeMinor: 0,
        vatMinor: 33750,
        platformCommissionMinor: 45000,
        totalMinor: 678750,
      },
    );

    expect(manager.create).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ recipientPhone: "2348031234567" }),
    );
    expect(manager.create).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ preparationNote: "No onions across the order" }),
    );
  });

  describe("Initiate totals validation", () => {
    const validPayload = {
      deliveryMode: "DELIVERY" as const,
      deliveryAddress: "12 Admiralty Way",
      deliveryLatitude: 6.4474,
      deliveryLongitude: 3.4542,
      items: [
        {
          menuItemId: "45ef3252-b96f-4308-b40e-391623b25ac9",
          quantity: 1,
        },
      ],
      subtotalMinor: 450000,
      deliveryFeeMinor: 150000,
      serviceFeeMinor: 0,
      vatMinor: 33750,
      platformCommissionMinor: 45000,
      totalMinor: 678750,
    };

    it("throws BadRequestException on subtotalMinor mismatch", async () => {
      await expect(
        service.initiate(
          { id: customerId, role: UserRole.CUSTOMER, sessionId: "s1", accessTokenId: "a1" },
          { ...validPayload, subtotalMinor: 400000 },
        ),
      ).rejects.toThrow(/Subtotal mismatch/);
    });

    it("throws BadRequestException on deliveryFeeMinor mismatch", async () => {
      await expect(
        service.initiate(
          { id: customerId, role: UserRole.CUSTOMER, sessionId: "s1", accessTokenId: "a1" },
          { ...validPayload, deliveryFeeMinor: 100000 },
        ),
      ).rejects.toThrow(/Delivery fee mismatch/);
    });

    it("throws BadRequestException on serviceFeeMinor mismatch", async () => {
      await expect(
        service.initiate(
          { id: customerId, role: UserRole.CUSTOMER, sessionId: "s1", accessTokenId: "a1" },
          { ...validPayload, serviceFeeMinor: 100 },
        ),
      ).rejects.toThrow(/Service fee mismatch/);
    });

    it("throws BadRequestException on vatMinor mismatch", async () => {
      await expect(
        service.initiate(
          { id: customerId, role: UserRole.CUSTOMER, sessionId: "s1", accessTokenId: "a1" },
          { ...validPayload, vatMinor: 100 },
        ),
      ).rejects.toThrow(/VAT mismatch/);
    });

    it("throws BadRequestException on platformCommissionMinor mismatch", async () => {
      await expect(
        service.initiate(
          { id: customerId, role: UserRole.CUSTOMER, sessionId: "s1", accessTokenId: "a1" },
          { ...validPayload, platformCommissionMinor: 100 },
        ),
      ).rejects.toThrow(/Platform commission mismatch/);
    });

    it("throws BadRequestException on totalMinor mismatch", async () => {
      await expect(
        service.initiate(
          { id: customerId, role: UserRole.CUSTOMER, sessionId: "s1", accessTokenId: "a1" },
          { ...validPayload, totalMinor: 600000 },
        ),
      ).rejects.toThrow(/Total mismatch/);
    });

    it("throws BadRequestException on invalid return URL", async () => {
      await expect(
        service.initiate(
          { id: customerId, role: UserRole.CUSTOMER, sessionId: "s1", accessTokenId: "a1" },
          { ...validPayload, returnUrl: "not-a-url" },
        ),
      ).rejects.toThrow(/Payment return URL/);

      expect(initiatePayment).not.toHaveBeenCalled();
    });
  });
});
