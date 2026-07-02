import { ForbiddenException } from "@nestjs/common";
import type { DataSource, Repository } from "typeorm";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Customer } from "../auth/customer.entity";
import { UserRole } from "../auth/user-role.enum";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PaymentsService } from "../payments/payments.service";
import type { RealtimeService } from "../realtime/realtime.service";
import { MasterOrder } from "./master-order.entity";
import { OrderLineItem } from "./order-line-item.entity";
import { MasterOrderStatus, SubOrderStatus } from "./order-status.enum";
import type { OrderStatusEvent } from "./order-status-event.entity";
import { OrdersService } from "./orders.service";
import { SubOrder } from "./sub-order.entity";

function createMasterOrderQueryBuilder(orders: MasterOrder[], total: number) {
  const queryBuilder = {
    orderBy: vi.fn(() => queryBuilder),
    take: vi.fn(() => queryBuilder),
    skip: vi.fn(() => queryBuilder),
    andWhere: vi.fn(() => queryBuilder),
    getManyAndCount: vi.fn().mockResolvedValue([orders, total] as [MasterOrder[], number]),
  };

  return queryBuilder;
}

function createService(input: {
  adminOutletId?: string | null;
  orders?: MasterOrder[];
  total?: number;
  subOrders?: SubOrder[];
  lineItems?: OrderLineItem[];
}) {
  const queryBuilder = createMasterOrderQueryBuilder(input.orders ?? [], input.total ?? 0);
  const users = {
    findOne: vi
      .fn()
      .mockResolvedValue(
        input.adminOutletId === undefined
          ? null
          : Object.assign(new Customer(), { id: "admin-id", outletId: input.adminOutletId }),
      ),
  };
  const masterOrders = {
    createQueryBuilder: vi.fn(() => queryBuilder),
  };
  const subOrders = {
    find: vi.fn().mockResolvedValue(input.subOrders ?? []),
    findOneBy: vi.fn().mockResolvedValue(null),
  };
  const lineItems = {
    find: vi.fn().mockResolvedValue(input.lineItems ?? []),
  };
  const service = new OrdersService(
    users as unknown as Repository<Customer>,
    masterOrders as unknown as Repository<MasterOrder>,
    subOrders as unknown as Repository<SubOrder>,
    lineItems as unknown as Repository<OrderLineItem>,
    {} as Repository<OrderStatusEvent>,
    {} as DataSource,
    {} as PaymentsService,
    {} as NotificationsService,
    {} as RealtimeService,
  );

  return { service, queryBuilder, users, subOrders, lineItems };
}

describe(OrdersService.name, () => {
  const outletId = "4273e96c-2887-49a5-a6d5-269f007f04f0";
  const otherOutletId = "c4d9bc72-f24f-42d5-ad27-d7c2f96ff781";
  const adminUser: AuthenticatedUser = {
    id: "admin-id",
    role: UserRole.ADMIN,
    sessionId: "session-id",
    accessTokenId: "access-token-id",
  };

  it("rejects outlet admins that request another outlet's orders", async () => {
    const { service } = createService({ adminOutletId: outletId });

    await expect(service.listAdmin(adminUser, { outletId: otherOutletId })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("scopes outlet admins to their outlet and returns visible sub-orders and line items", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "50296ef7-fb39-4b42-ae55-81caec8efd21",
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      status: MasterOrderStatus.CONFIRMED,
      createdAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const subOrder = Object.assign(new SubOrder(), {
      id: "8f36ee26-6f25-47cf-aed7-26afcb6278fe",
      masterOrderId: order.id,
      outletId,
      status: SubOrderStatus.PREPARING,
      createdAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const lineItem = Object.assign(new OrderLineItem(), {
      id: "b4eec994-872d-4915-9e12-b31947f96c3b",
      masterOrderId: order.id,
      subOrderId: subOrder.id,
      outletId,
      itemNameSnapshot: "Jollof Rice",
      createdAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const { service, queryBuilder } = createService({
      adminOutletId: outletId,
      orders: [order],
      total: 1,
      subOrders: [subOrder],
      lineItems: [lineItem],
    });

    await expect(
      service.listAdmin(adminUser, { status: MasterOrderStatus.CONFIRMED }),
    ).resolves.toEqual({
      orders: [{ order, subOrders: [subOrder], lineItems: [lineItem] }],
      total: 1,
      limit: 50,
      offset: 0,
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("adminSubOrder.outlet_id = :outletId"),
      expect.objectContaining({ outletId }),
    );
  });

  it("allows super admins to filter by outlet and sub-order status", async () => {
    const { service, queryBuilder } = createService({ orders: [], total: 0 });
    const superAdmin: AuthenticatedUser = {
      id: "super-admin-id",
      role: UserRole.SUPER_ADMIN,
      sessionId: "session-id",
      accessTokenId: "access-token-id",
    };

    await expect(
      service.listAdmin(superAdmin, {
        outletId,
        subOrderStatus: SubOrderStatus.READY,
        limit: 25,
        offset: 10,
      }),
    ).resolves.toEqual({ orders: [], total: 0, limit: 25, offset: 10 });

    expect(queryBuilder.take).toHaveBeenCalledWith(25);
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("adminSubOrder.status = :subOrderStatus"),
      expect.objectContaining({ outletId, subOrderStatus: SubOrderStatus.READY }),
    );
  });
});
