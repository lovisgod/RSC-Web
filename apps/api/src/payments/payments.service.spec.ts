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
import type { MasterOrder } from "../orders/master-order.entity";
import type { OrderLineItem } from "../orders/order-line-item.entity";
import type { SubOrder } from "../orders/sub-order.entity";
import { Outlet } from "../outlets/outlet.entity";
import type { RealtimeService } from "../realtime/realtime.service";
import type { Payment } from "./payment.entity";
import { PaymentStatus } from "./payment.entity";
import type {
  InitiateProviderPaymentInput,
  InitiateProviderPaymentResult,
  PaymentAdapter,
  RefundProviderPaymentInput,
  RefundProviderPaymentResult,
} from "./payment-adapter";
import type { PaymentRefund } from "./payment-refund.entity";
import { PaymentsService } from "./payments.service";

describe(PaymentsService.name, () => {
  const customerId = "2abf9577-027c-4936-83a8-e004fd56a46e";
  const outletId = "4273e96c-2887-49a5-a6d5-269f007f04f0";
  let service: PaymentsService;
  let users: { findOneBy: ReturnType<typeof vi.fn> };
  let menuItems: { findBy: ReturnType<typeof vi.fn> };
  let modifiers: { findBy: ReturnType<typeof vi.fn> };
  let outlets: { findBy: ReturnType<typeof vi.fn> };
  let payments: { findOneBy: ReturnType<typeof vi.fn> };
  let refunds: {
    find: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let dataSource: { query: ReturnType<typeof vi.fn>; transaction: ReturnType<typeof vi.fn> };
  let delivery: { validateAddress: ReturnType<typeof vi.fn> };
  let paymentAdapter: PaymentAdapter;
  let initiatePayment: (
    input: InitiateProviderPaymentInput,
  ) => Promise<InitiateProviderPaymentResult>;
  let refundPayment: (input: RefundProviderPaymentInput) => Promise<RefundProviderPaymentResult>;
  let realtime: { emitSuborderNew: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    users = {
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
    payments = {
      findOneBy: vi.fn().mockResolvedValue({
        id: "f5e8f6ff-e76c-4ef4-8dd2-9ef601bd9705",
        masterOrderId: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
        amountMinor: 645000,
        currency: "NGN",
        gateway: "local",
        reference: "RSC-reference",
        status: PaymentStatus.SUCCESS,
      }),
    };
    refunds = {
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((value: Partial<PaymentRefund>) => value),
      save: vi.fn((value: Partial<PaymentRefund>) =>
        Promise.resolve({
          id: "2d314436-919a-4873-ad0f-92d8d79ce448",
          createdAt: new Date("2026-07-12T12:00:00.000Z"),
          ...value,
        }),
      ),
    };
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
    realtime = { emitSuborderNew: vi.fn() };

    service = new PaymentsService(
      users as unknown as Repository<Customer>,
      menuItems as unknown as Repository<MenuItem>,
      modifiers as unknown as Repository<ItemModifier>,
      outlets as unknown as Repository<Outlet>,
      {} as Repository<MasterOrder>,
      {} as Repository<SubOrder>,
      {} as Repository<OrderLineItem>,
      payments as unknown as Repository<Payment>,
      refunds as unknown as Repository<PaymentRefund>,
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
      },
    );

    expect(initiatePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: 925500,
      }),
    );
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
  });
});
