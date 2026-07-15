import { ForbiddenException } from "@nestjs/common";
import type { DataSource, Repository } from "typeorm";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Customer } from "../auth/customer.entity";
import { UserRole } from "../auth/user-role.enum";
import type { NotificationsService } from "../notifications/notifications.service";
import { Outlet } from "../outlets/outlet.entity";
import type { PaymentsService } from "../payments/payments.service";
import type { RealtimeService } from "../realtime/realtime.service";
import { MasterOrder } from "./master-order.entity";
import { OrderLineItem } from "./order-line-item.entity";
import { MasterOrderStatus, SubOrderStatus } from "./order-status.enum";
import type { OrderStatusEvent } from "./order-status-event.entity";
import { OrdersService } from "./orders.service";
import { SubOrder } from "./sub-order.entity";
import type { PiiCryptoService } from "../common/security/pii-crypto.service";

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
  availableRiders?: Array<{ id: string; assignmentCount: number }>;
  riders?: Customer[];
  outlets?: Outlet[];
  total?: number;
  subOrders?: SubOrder[];
  lineItems?: OrderLineItem[];
}) {
  const queryBuilder = createMasterOrderQueryBuilder(input.orders ?? [], input.total ?? 0);
  const users = {
    findOne: vi.fn(({ where }: { where: Partial<Customer> }) => {
      if (where.role === UserRole.ADMIN) {
        return Promise.resolve(
          input.adminOutletId === undefined
            ? null
            : Object.assign(new Customer(), { id: "admin-id", outletId: input.adminOutletId }),
        );
      }

      return Promise.resolve(
        (input.riders ?? []).find((rider) =>
          Object.entries(where).every(([key, value]) => rider[key as keyof Customer] === value),
        ) ?? null,
      );
    }),
    findOneBy: vi.fn((where: Partial<Customer>) => {
      if (where.role === UserRole.ADMIN) {
        return Promise.resolve(
          input.adminOutletId === undefined
            ? null
            : Object.assign(new Customer(), { id: "admin-id", outletId: input.adminOutletId }),
        );
      }

      return Promise.resolve(
        (input.riders ?? []).find((rider) =>
          Object.entries(where).every(([key, value]) => rider[key as keyof Customer] === value),
        ) ?? null,
      );
    }),
  };
  const masterOrders = {
    createQueryBuilder: vi.fn(() => queryBuilder),
    findAndCount: vi.fn().mockResolvedValue([input.orders ?? [], input.total ?? 0]),
    find: vi.fn(({ where }: { where: Partial<MasterOrder> }) =>
      Promise.resolve(
        (input.orders ?? []).filter((order) =>
          Object.entries(where).every(([key, value]) => {
            const orderValue = order[key as keyof MasterOrder];

            if (value && typeof value === "object" && "_value" in value) {
              return (value as { _value: unknown[] })._value.includes(orderValue);
            }

            return orderValue === value;
          }),
        ),
      ),
    ),
    findOneBy: vi.fn(({ id }: { id: string }) =>
      Promise.resolve((input.orders ?? []).find((order) => order.id === id) ?? null),
    ),
    save: vi.fn((order: MasterOrder) => Promise.resolve(order)),
  };
  const outlets = {
    findBy: vi.fn().mockResolvedValue(input.outlets ?? []),
  };
  const subOrders = {
    find: vi.fn().mockResolvedValue(input.subOrders ?? []),
    findOneBy: vi.fn((where: Partial<SubOrder>) =>
      Promise.resolve(
        (input.subOrders ?? []).find((subOrder) =>
          Object.entries(where).every(([key, value]) => subOrder[key as keyof SubOrder] === value),
        ) ?? null,
      ),
    ),
    save: vi.fn((subOrder: SubOrder) => Promise.resolve(subOrder)),
  };
  const lineItems = {
    find: vi.fn().mockResolvedValue(input.lineItems ?? []),
  };
  const statusEvents = {
    create: vi.fn((event: Partial<OrderStatusEvent>) => event),
    find: vi.fn().mockResolvedValue([]),
    save: vi.fn((event: Partial<OrderStatusEvent>) => Promise.resolve(event)),
  };
  const notifications = {
    createAndPush: vi.fn().mockResolvedValue({}),
  };
  const realtime = {
    emitOrderStatusUpdate: vi.fn(),
  };
  const dataSource = {
    query: vi.fn((sql: string) =>
      Promise.resolve(sql.includes("FROM users u") ? (input.availableRiders ?? []) : []),
    ),
  };
  const piiCrypto = {
    decrypt: vi.fn((val: string): string => val),
  };
  const service = new OrdersService(
    users as unknown as Repository<Customer>,
    outlets as unknown as Repository<Outlet>,
    masterOrders as unknown as Repository<MasterOrder>,
    subOrders as unknown as Repository<SubOrder>,
    lineItems as unknown as Repository<OrderLineItem>,
    statusEvents as unknown as Repository<OrderStatusEvent>,
    dataSource as unknown as DataSource,
    {} as PaymentsService,
    notifications as unknown as NotificationsService,
    realtime as unknown as RealtimeService,
    piiCrypto as unknown as PiiCryptoService,
  );

  return {
    service,
    queryBuilder,
    users,
    masterOrders,
    subOrders,
    lineItems,
    statusEvents,
    notifications,
    realtime,
    dataSource,
  };
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
  const riderUser: AuthenticatedUser = {
    id: "07c89f55-9343-4e69-bd41-bc18dcaf1478",
    role: UserRole.RIDER,
    sessionId: "session-id",
    accessTokenId: "access-token-id",
  };

  it("rejects outlet admins that request another outlet's orders", async () => {
    const { service } = createService({ adminOutletId: outletId });

    await expect(service.listAdmin(adminUser, { outletId: otherOutletId })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("marks dispatched sub-orders collected when rider completes delivery", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "4c14d989-9057-4380-a2ad-63a8a4ec7abf",
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      riderId: riderUser.id,
      status: MasterOrderStatus.OUT_FOR_DELIVERY,
      deliveryCode: "956922",
      createdAt: new Date("2026-07-15T20:00:00.000Z"),
      updatedAt: new Date("2026-07-15T20:52:40.541Z"),
    });
    const subOrder = Object.assign(new SubOrder(), {
      id: "01420207-6270-4b2b-9050-3d6b7c5d9751",
      masterOrderId: order.id,
      outletId,
      status: SubOrderStatus.DISPATCHED,
      createdAt: new Date("2026-07-15T20:00:00.000Z"),
    });
    const { service, subOrders, masterOrders, realtime } = createService({
      orders: [order],
      subOrders: [subOrder],
    });

    const result = await service.completeDelivery(riderUser, order.id, { code: "956922" });

    expect(subOrder.status).toBe(SubOrderStatus.COLLECTED);
    expect(subOrders.save).toHaveBeenCalledWith(subOrder);
    expect(masterOrders.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: MasterOrderStatus.DELIVERED }),
    );
    expect(result.order.status).toBe(MasterOrderStatus.DELIVERED);
    expect(result.subOrders).toEqual([
      expect.objectContaining({ id: subOrder.id, status: SubOrderStatus.COLLECTED }),
    ]);
    expect(realtime.emitOrderStatusUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: MasterOrderStatus.DELIVERED }),
    );
  });

  it("delivers the fulfillable part of a mixed rejected delivery when rider completes delivery", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "255b671b-fbc3-4986-8ff0-24757343939b",
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      riderId: riderUser.id,
      status: MasterOrderStatus.OUT_FOR_DELIVERY,
      deliveryCode: "123456",
      createdAt: new Date("2026-07-15T20:00:00.000Z"),
      updatedAt: new Date("2026-07-15T20:52:40.541Z"),
    });
    const dispatchedSubOrder = Object.assign(new SubOrder(), {
      id: "01420207-6270-4b2b-9050-3d6b7c5d9751",
      masterOrderId: order.id,
      outletId,
      status: SubOrderStatus.DISPATCHED,
      createdAt: new Date("2026-07-15T20:00:00.000Z"),
    });
    const rejectedSubOrder = Object.assign(new SubOrder(), {
      id: "2b039b0c-0e1a-4e3e-8387-4a8c60621581",
      masterOrderId: order.id,
      outletId: otherOutletId,
      status: SubOrderStatus.REJECTED,
      createdAt: new Date("2026-07-15T20:00:00.000Z"),
    });
    const { service, subOrders } = createService({
      orders: [order],
      subOrders: [dispatchedSubOrder, rejectedSubOrder],
    });

    const result = await service.completeDelivery(riderUser, order.id, { code: "123456" });

    expect(dispatchedSubOrder.status).toBe(SubOrderStatus.COLLECTED);
    expect(rejectedSubOrder.status).toBe(SubOrderStatus.REJECTED);
    expect(subOrders.save).toHaveBeenCalledTimes(1);
    expect(result.order.status).toBe(MasterOrderStatus.DELIVERED);
    expect(result.subOrders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: dispatchedSubOrder.id, status: SubOrderStatus.COLLECTED }),
        expect.objectContaining({ id: rejectedSubOrder.id, status: SubOrderStatus.REJECTED }),
      ]),
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
      totalSubOrders: 1,
      limit: 50,
      offset: 0,
      next: null,
      previous: null,
      hasNext: false,
      hasPrevious: false,
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
    ).resolves.toEqual({
      orders: [],
      total: 0,
      totalSubOrders: 0,
      limit: 25,
      offset: 10,
      next: null,
      previous: 0,
      hasNext: false,
      hasPrevious: true,
    });

    expect(queryBuilder.take).toHaveBeenCalledWith(25);
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining("adminSubOrder.status = :subOrderStatus"),
      expect.objectContaining({ outletId, subOrderStatus: SubOrderStatus.READY }),
    );
  });

  it("updates only the outlet admin's sub-order when a sub-order id is passed", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      riderId: null,
      status: MasterOrderStatus.CONFIRMED,
      updatedAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const outletSubOrder = Object.assign(new SubOrder(), {
      id: "be139e74-fd59-430c-9b16-e0c8aeb72ff2",
      masterOrderId: order.id,
      outletId,
      status: SubOrderStatus.PENDING,
    });
    const otherSubOrder = Object.assign(new SubOrder(), {
      id: "6b8537f9-b0c1-4df3-8567-aa49517d7de1",
      masterOrderId: order.id,
      outletId: otherOutletId,
      status: SubOrderStatus.PENDING,
    });
    const { service, masterOrders, subOrders, statusEvents } = createService({
      adminOutletId: outletId,
      orders: [order],
      subOrders: [outletSubOrder, otherSubOrder],
    });

    await service.updateStatus(adminUser, outletSubOrder.id, {
      status: MasterOrderStatus.CONFIRMED,
    });

    expect(outletSubOrder.status).toBe(SubOrderStatus.ACCEPTED);
    expect(otherSubOrder.status).toBe(SubOrderStatus.PENDING);
    expect(subOrders.save).toHaveBeenCalledWith(outletSubOrder);
    expect(masterOrders.save).not.toHaveBeenCalled();
    expect(statusEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        masterOrderId: order.id,
        subOrderId: outletSubOrder.id,
        masterStatus: MasterOrderStatus.CONFIRMED,
        subOrderStatus: SubOrderStatus.ACCEPTED,
      }),
    );
  });

  it("marks the master order as preparing when the only sub-order starts preparing", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      riderId: null,
      status: MasterOrderStatus.CONFIRMED,
      updatedAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const outletSubOrder = Object.assign(new SubOrder(), {
      id: "be139e74-fd59-430c-9b16-e0c8aeb72ff2",
      masterOrderId: order.id,
      outletId,
      status: SubOrderStatus.ACCEPTED,
    });
    const { service, masterOrders, statusEvents } = createService({
      adminOutletId: outletId,
      orders: [order],
      subOrders: [outletSubOrder],
    });

    await service.updateStatus(adminUser, outletSubOrder.id, {
      status: MasterOrderStatus.PREPARING,
    });

    expect(outletSubOrder.status).toBe(SubOrderStatus.PREPARING);
    expect(order.status).toBe(MasterOrderStatus.PREPARING);
    expect(masterOrders.save).toHaveBeenCalledWith(order);
    expect(statusEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        masterOrderId: order.id,
        subOrderId: outletSubOrder.id,
        masterStatus: MasterOrderStatus.PREPARING,
        subOrderStatus: SubOrderStatus.PREPARING,
      }),
    );
  });

  it("marks the master order partially ready when one sub-order is ready and another is preparing", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      riderId: null,
      status: MasterOrderStatus.PREPARING,
      updatedAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const outletSubOrder = Object.assign(new SubOrder(), {
      id: "be139e74-fd59-430c-9b16-e0c8aeb72ff2",
      masterOrderId: order.id,
      outletId,
      status: SubOrderStatus.PREPARING,
    });
    const otherSubOrder = Object.assign(new SubOrder(), {
      id: "6b8537f9-b0c1-4df3-8567-aa49517d7de1",
      masterOrderId: order.id,
      outletId: otherOutletId,
      status: SubOrderStatus.PREPARING,
    });
    const { service, masterOrders } = createService({
      adminOutletId: outletId,
      orders: [order],
      subOrders: [outletSubOrder, otherSubOrder],
    });

    await service.updateStatus(adminUser, outletSubOrder.id, {
      status: MasterOrderStatus.READY,
    });

    expect(outletSubOrder.status).toBe(SubOrderStatus.READY);
    expect(otherSubOrder.status).toBe(SubOrderStatus.PREPARING);
    expect(order.status).toBe(MasterOrderStatus.PARTIALLY_READY);
    expect(masterOrders.save).toHaveBeenCalledWith(order);
  });

  it("marks the master order partially fulfilled when one sub-order is accepted and another is rejected", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      riderId: null,
      status: MasterOrderStatus.CONFIRMED,
      updatedAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const acceptedSubOrder = Object.assign(new SubOrder(), {
      id: "be139e74-fd59-430c-9b16-e0c8aeb72ff2",
      masterOrderId: order.id,
      outletId,
      status: SubOrderStatus.ACCEPTED,
    });
    const rejectedSubOrder = Object.assign(new SubOrder(), {
      id: "6b8537f9-b0c1-4df3-8567-aa49517d7de1",
      masterOrderId: order.id,
      outletId: otherOutletId,
      status: SubOrderStatus.ACCEPTED,
    });
    const { service, masterOrders } = createService({
      adminOutletId: otherOutletId,
      orders: [order],
      subOrders: [acceptedSubOrder, rejectedSubOrder],
    });

    await service.updateStatus(adminUser, rejectedSubOrder.id, {
      status: MasterOrderStatus.CANCELLED,
      rejectionReason: "Item unavailable",
    });

    expect(acceptedSubOrder.status).toBe(SubOrderStatus.ACCEPTED);
    expect(rejectedSubOrder.status).toBe(SubOrderStatus.REJECTED);
    expect(order.status).toBe(MasterOrderStatus.PARTIALLY_FULFILLED);
    expect(masterOrders.save).toHaveBeenCalledWith(order);
  });

  it("returns rejectionReason when an outlet admin rejects a sub-order", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      riderId: null,
      status: MasterOrderStatus.CONFIRMED,
      updatedAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const outletSubOrder = Object.assign(new SubOrder(), {
      id: "be139e74-fd59-430c-9b16-e0c8aeb72ff2",
      masterOrderId: order.id,
      outletId,
      status: SubOrderStatus.PENDING,
    });
    const { service } = createService({
      adminOutletId: outletId,
      orders: [order],
      subOrders: [outletSubOrder],
    });

    const result = await service.updateStatus(adminUser, outletSubOrder.id, {
      status: MasterOrderStatus.CANCELLED,
      rejectionReason: "Ingredient unavailable",
    });

    expect(outletSubOrder.status).toBe(SubOrderStatus.REJECTED);
    expect(outletSubOrder.preparationNote).toBe("Ingredient unavailable");
    expect(result.subOrders).toContainEqual(
      expect.objectContaining({
        id: outletSubOrder.id,
        status: SubOrderStatus.REJECTED,
        rejectionReason: "Ingredient unavailable",
      }),
    );
  });

  it("allows outlet admins to assign a fair available rider from their outlet", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      riderId: null,
      status: MasterOrderStatus.READY,
      deliveryMode: "DELIVERY",
      deliveryLatitude: 6.4474,
      deliveryLongitude: 3.4542,
      updatedAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const outletSubOrder = Object.assign(new SubOrder(), {
      id: "be139e74-fd59-430c-9b16-e0c8aeb72ff2",
      masterOrderId: order.id,
      outletId,
      status: SubOrderStatus.READY,
    });
    const riderId = "07c89f55-9343-4e69-bd41-bc18dcaf1478";
    const { service, masterOrders, notifications, realtime, dataSource } = createService({
      adminOutletId: outletId,
      orders: [order],
      availableRiders: [{ id: riderId, assignmentCount: 1 }],
      outlets: [
        Object.assign(new Outlet(), {
          id: outletId,
          name: "Outlet One",
          address: "12 Admiralty Way",
          latitude: 6.4474,
          longitude: 3.4542,
        }),
      ],
      subOrders: [outletSubOrder],
    });

    await service.assignRider(adminUser, order.id, {});

    expect(order.riderId).toBe(riderId);
    expect(masterOrders.save).toHaveBeenCalledWith(order);
    expect(notifications.createAndPush).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: riderId,
        recipientRole: UserRole.RIDER,
        type: "ORDER_ASSIGNMENT",
      }),
    );
    expect(realtime.emitOrderStatusUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ masterOrderId: order.id, riderId }),
    );
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY "assignmentCount" ASC'),
      expect.arrayContaining([expect.arrayContaining(["DELIVERED", "CANCELLED"]), outletId]),
    );
  });

  it("auto-assigns an available rider when an order becomes ready", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      riderId: null,
      status: MasterOrderStatus.PARTIALLY_READY,
      deliveryMode: "DELIVERY",
      updatedAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const outletSubOrder = Object.assign(new SubOrder(), {
      id: "be139e74-fd59-430c-9b16-e0c8aeb72ff2",
      masterOrderId: order.id,
      outletId,
      pickupCode: "123456",
      status: SubOrderStatus.PREPARING,
    });
    const riderId = "07c89f55-9343-4e69-bd41-bc18dcaf1478";
    const { service, notifications, realtime, dataSource } = createService({
      adminOutletId: outletId,
      orders: [order],
      availableRiders: [{ id: riderId, assignmentCount: 0 }],
      outlets: [Object.assign(new Outlet(), { id: outletId, name: "Outlet One" })],
      subOrders: [outletSubOrder],
    });

    await service.updateStatus(adminUser, outletSubOrder.id, {
      status: MasterOrderStatus.READY,
    });

    expect(order.status).toBe(MasterOrderStatus.READY);
    expect(order.riderId).toBe(riderId);
    expect(notifications.createAndPush).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: riderId,
        recipientRole: UserRole.RIDER,
        type: "ORDER_ASSIGNMENT",
      }),
    );
    expect(realtime.emitOrderStatusUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ masterOrderId: order.id, riderId }),
    );
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY "assignmentCount" ASC'),
      expect.not.arrayContaining([outletId]),
    );
  });

  it("returns not found when no available free rider exists", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      riderId: null,
      status: MasterOrderStatus.READY,
      deliveryMode: "DELIVERY",
      deliveryLatitude: 6.4474,
      deliveryLongitude: 3.4542,
    });
    const outletSubOrder = Object.assign(new SubOrder(), {
      id: "be139e74-fd59-430c-9b16-e0c8aeb72ff2",
      masterOrderId: order.id,
      outletId,
      status: SubOrderStatus.READY,
    });
    const { service } = createService({
      adminOutletId: outletId,
      orders: [order],
      availableRiders: [],
      subOrders: [outletSubOrder],
    });

    await expect(service.assignRider(adminUser, order.id, {})).rejects.toThrow(
      "No available free rider",
    );
  });

  it("lists active preparing dispatches assigned to the calling rider", async () => {
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      riderId: riderUser.id,
      status: MasterOrderStatus.PREPARING,
      deliveryMode: "DELIVERY",
      createdAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const subOrder = Object.assign(new SubOrder(), {
      id: "be139e74-fd59-430c-9b16-e0c8aeb72ff2",
      masterOrderId: order.id,
      outletId,
      pickupCode: "123456",
      status: SubOrderStatus.PREPARING,
    });
    const lineItem = Object.assign(new OrderLineItem(), {
      id: "a43a459d-a9c0-4c81-a9be-f5ed41d9dfde",
      masterOrderId: order.id,
      subOrderId: subOrder.id,
      itemNameSnapshot: "Jollof Rice",
      quantity: 2,
      modifiersSnapshot: [],
    });
    const { service } = createService({
      orders: [order],
      outlets: [Object.assign(new Outlet(), { id: outletId, name: "Outlet One" })],
      subOrders: [subOrder],
      lineItems: [lineItem],
    });

    const result = await service.listAssignedDispatches(riderUser);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        orderId: order.id,
        status: MasterOrderStatus.PREPARING,
        riderId: riderUser.id,
        outlets: [
          expect.objectContaining({
            pickupCode: "123456",
            items: [expect.objectContaining({ name: "Jollof Rice", quantity: 2 })],
          }),
        ],
      }),
    );
  });

  it("lets a rider reject an assigned order and reassigns another fair rider", async () => {
    const replacementRiderId = "607f5f68-1346-487f-88c9-d1dde472ce28";
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId: "2abf9577-027c-4936-83a8-e004fd56a46e",
      riderId: riderUser.id,
      status: MasterOrderStatus.READY,
      deliveryMode: "DELIVERY",
      updatedAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const subOrder = Object.assign(new SubOrder(), {
      id: "be139e74-fd59-430c-9b16-e0c8aeb72ff2",
      masterOrderId: order.id,
      outletId,
      pickupCode: "123456",
      status: SubOrderStatus.READY,
    });
    const { service, masterOrders, statusEvents, notifications, dataSource } = createService({
      orders: [order],
      availableRiders: [{ id: replacementRiderId, assignmentCount: 0 }],
      outlets: [Object.assign(new Outlet(), { id: outletId, name: "Outlet One" })],
      subOrders: [subOrder],
    });

    const result = await service.rejectAssignedOrder(riderUser, order.id, {
      reason: "Bike issue",
    });

    expect(result).toEqual(
      expect.objectContaining({
        rejected: true,
        reassigned: true,
        previousRiderId: riderUser.id,
        riderId: replacementRiderId,
      }),
    );
    expect(order.riderId).toBe(replacementRiderId);
    expect(masterOrders.save).toHaveBeenCalledTimes(2);
    expect(masterOrders.save).toHaveBeenCalledWith(
      expect.objectContaining({ riderId: replacementRiderId }),
    );
    expect(statusEvents.create).toHaveBeenCalledWith(
      expect.objectContaining({ note: "Rider rejected assignment: Bike issue" }),
    );
    expect(notifications.createAndPush).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: replacementRiderId, type: "ORDER_ASSIGNMENT" }),
    );
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining("u.id <> ALL"),
      expect.arrayContaining([expect.arrayContaining([riderUser.id])]),
    );
  });

  it("splits delivered customer order history into fulfilled and failed customer views", async () => {
    const customerUser: AuthenticatedUser = {
      id: "2abf9577-027c-4936-83a8-e004fd56a46e",
      role: UserRole.CUSTOMER,
      sessionId: "session-id",
      accessTokenId: "access-token-id",
    };
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId: customerUser.id,
      riderId: null,
      status: MasterOrderStatus.DELIVERED,
      subtotalMinor: 100000,
      deliveryFeeMinor: 15000,
      serviceFeeMinor: 0,
      vatMinor: 7500,
      discountMinor: 0,
      totalMinor: 132500,
      currency: "NGN" as const,
      deliveryMode: "DELIVERY" as const,
      deliveryAddress: "12 Admiralty Way",
      deliveryLatitude: 6.4474,
      deliveryLongitude: 3.4542,
      recipientPhone: null,
      paymentReference: "RSC-reference",
      deliveryCode: "123456",
      createdAt: new Date("2026-07-02T08:00:00.000Z"),
      updatedAt: new Date("2026-07-02T08:00:00.000Z"),
      deletedAt: null,
    });
    const fulfilledSubOrder = Object.assign(new SubOrder(), {
      id: "be139e74-fd59-430c-9b16-e0c8aeb72ff2",
      masterOrderId: order.id,
      outletId,
      status: SubOrderStatus.DISPATCHED,
      subtotalMinor: 60000,
      commissionMinor: 6000,
      createdAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const rejectedSubOrder = Object.assign(new SubOrder(), {
      id: "6b8537f9-b0c1-4df3-8567-aa49517d7de1",
      masterOrderId: order.id,
      outletId: otherOutletId,
      status: SubOrderStatus.REJECTED,
      subtotalMinor: 40000,
      commissionMinor: 4000,
      createdAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const { service } = createService({
      orders: [order],
      total: 1,
      subOrders: [fulfilledSubOrder, rejectedSubOrder],
    });

    const result = await service.listMine(customerUser);

    expect(result.orders).toHaveLength(2);
    expect(result.orders[0]).toEqual(
      expect.objectContaining({
        id: `${order.id}:fulfilled`,
        sourceMasterOrderId: order.id,
        splitKind: "FULFILLED",
        status: MasterOrderStatus.DELIVERED,
        totalMinor: 85500,
      }),
    );
    expect(result.orders[1]).toEqual(
      expect.objectContaining({
        id: `${order.id}:failed`,
        sourceMasterOrderId: order.id,
        splitKind: "FAILED",
        status: MasterOrderStatus.CANCELLED,
        refundSubOrderIds: [rejectedSubOrder.id],
        refundableMinor: 47000,
        totalMinor: 47000,
      }),
    );
  });

  it("reconciles a stale master status when order detail is fetched", async () => {
    const customerUser: AuthenticatedUser = {
      id: "2abf9577-027c-4936-83a8-e004fd56a46e",
      role: UserRole.CUSTOMER,
      sessionId: "session-id",
      accessTokenId: "access-token-id",
    };
    const order = Object.assign(new MasterOrder(), {
      id: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
      customerId: customerUser.id,
      riderId: null,
      status: MasterOrderStatus.CONFIRMED,
      createdAt: new Date("2026-07-02T08:00:00.000Z"),
      updatedAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const acceptedSubOrder = Object.assign(new SubOrder(), {
      id: "be139e74-fd59-430c-9b16-e0c8aeb72ff2",
      masterOrderId: order.id,
      outletId,
      status: SubOrderStatus.ACCEPTED,
      createdAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const rejectedSubOrder = Object.assign(new SubOrder(), {
      id: "6b8537f9-b0c1-4df3-8567-aa49517d7de1",
      masterOrderId: order.id,
      outletId: otherOutletId,
      status: SubOrderStatus.REJECTED,
      createdAt: new Date("2026-07-02T08:00:00.000Z"),
    });
    const { service, masterOrders } = createService({
      orders: [order],
      subOrders: [acceptedSubOrder, rejectedSubOrder],
    });

    const result = await service.getMine(customerUser, order.id);

    expect(result.order.status).toBe(MasterOrderStatus.PARTIALLY_FULFILLED);
    expect(masterOrders.save).toHaveBeenCalledWith(order);
  });
});
