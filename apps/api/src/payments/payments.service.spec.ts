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
import type { PaymentAdapter } from "./payment-adapter";
import { PaymentsService } from "./payments.service";

describe(PaymentsService.name, () => {
  const customerId = "2abf9577-027c-4936-83a8-e004fd56a46e";
  const outletId = "4273e96c-2887-49a5-a6d5-269f007f04f0";
  let service: PaymentsService;
  let users: { findOneBy: ReturnType<typeof vi.fn> };
  let menuItems: { findBy: ReturnType<typeof vi.fn> };
  let modifiers: { findBy: ReturnType<typeof vi.fn> };
  let outlets: { findBy: ReturnType<typeof vi.fn> };
  let dataSource: { query: ReturnType<typeof vi.fn>; transaction: ReturnType<typeof vi.fn> };
  let delivery: { validateAddress: ReturnType<typeof vi.fn> };
  let paymentAdapter: PaymentAdapter;
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
          momentSubaccountCode: "MOMENT_LEKKI",
        }),
      ]),
    };
    dataSource = { query: vi.fn().mockResolvedValue([]), transaction: vi.fn() };
    delivery = {
      validateAddress: vi.fn().mockResolvedValue({
        deliverable: true,
        zone: { id: "lagos-expanded", name: "Lagos Island Expanded Delivery Zone" },
      }),
    };
    paymentAdapter = {
      initiate: vi.fn().mockResolvedValue({
        gateway: "local",
        reference: "RSC-reference",
        status: "SUCCESS",
        checkoutUrl: null,
        providerResponse: {},
      }),
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
      {} as Repository<Payment>,
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
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
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
});
