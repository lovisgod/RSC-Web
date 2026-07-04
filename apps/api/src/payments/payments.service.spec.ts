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
      { initiate: vi.fn() },
      { emitSuborderNew: vi.fn() } as unknown as RealtimeService,
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
});
