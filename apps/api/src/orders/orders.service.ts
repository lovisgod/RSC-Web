import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Customer } from "../auth/customer.entity";
import { UserRole } from "../auth/user-role.enum";
import { NotificationsService } from "../notifications/notifications.service";
import { RealtimeService } from "../realtime/realtime.service";
import type { InitiatePaymentDto } from "../payments/dto/payment.dto";
import { PaymentsService } from "../payments/payments.service";
import { MasterOrder } from "./master-order.entity";
import { OrderLineItem } from "./order-line-item.entity";
import { MasterOrderStatus } from "./order-status.enum";
import { OrderStatusEvent } from "./order-status-event.entity";
import { SubOrder } from "./sub-order.entity";
import type {
  CompleteDeliveryDto,
  ListAdminOrdersQueryDto,
  UpdateOrderStatusDto,
} from "./dto/orders.dto";

export interface LatestLocation {
  riderId: string;
  masterOrderId: string | null;
  latitude: number;
  longitude: number;
  recordedAt: Date;
}

export interface AdminOrderListResult {
  orders: Array<{
    order: MasterOrder;
    subOrders: SubOrder[];
    lineItems: OrderLineItem[];
  }>;
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Customer) private readonly users: Repository<Customer>,
    @InjectRepository(MasterOrder) private readonly masterOrders: Repository<MasterOrder>,
    @InjectRepository(SubOrder) private readonly subOrders: Repository<SubOrder>,
    @InjectRepository(OrderLineItem) private readonly lineItems: Repository<OrderLineItem>,
    @InjectRepository(OrderStatusEvent)
    private readonly statusEvents: Repository<OrderStatusEvent>,
    private readonly dataSource: DataSource,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
  ) {}

  listMine(user: AuthenticatedUser): Promise<MasterOrder[]> {
    return this.masterOrders.find({
      where: { customerId: user.id },
      order: { createdAt: "DESC" },
    });
  }

  async listAdmin(
    user: AuthenticatedUser,
    query: ListAdminOrdersQueryDto,
  ): Promise<AdminOrderListResult> {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Order listing requires admin access");
    }

    const scopedOutletId =
      user.role === UserRole.ADMIN ? await this.requireAdminOutletId(user) : query.outletId;

    if (user.role === UserRole.ADMIN && query.outletId && query.outletId !== scopedOutletId) {
      throw new ForbiddenException("Cannot view another outlet's orders");
    }

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const orderQuery = this.masterOrders
      .createQueryBuilder("masterOrder")
      .orderBy("masterOrder.createdAt", "DESC")
      .take(limit)
      .skip(offset);

    if (query.status) {
      orderQuery.andWhere("masterOrder.status = :status", { status: query.status });
    }

    if (query.deliveryMode) {
      orderQuery.andWhere("masterOrder.deliveryMode = :deliveryMode", {
        deliveryMode: query.deliveryMode,
      });
    }

    if (query.customerId) {
      orderQuery.andWhere("masterOrder.customerId = :customerId", { customerId: query.customerId });
    }

    if (query.dateFrom) {
      orderQuery.andWhere("masterOrder.createdAt >= :dateFrom", {
        dateFrom: new Date(query.dateFrom),
      });
    }

    if (query.dateTo) {
      orderQuery.andWhere("masterOrder.createdAt <= :dateTo", { dateTo: new Date(query.dateTo) });
    }

    if (scopedOutletId || query.subOrderStatus) {
      const clauses = ['adminSubOrder.master_order_id = "masterOrder"."id"'];
      const params: Record<string, string> = {};

      if (scopedOutletId) {
        clauses.push("adminSubOrder.outlet_id = :outletId");
        params.outletId = scopedOutletId;
      }

      if (query.subOrderStatus) {
        clauses.push("adminSubOrder.status = :subOrderStatus");
        params.subOrderStatus = query.subOrderStatus;
      }

      orderQuery.andWhere(
        `EXISTS (SELECT 1 FROM sub_orders adminSubOrder WHERE ${clauses.join(" AND ")})`,
        params,
      );
    }

    const [orders, total] = await orderQuery.getManyAndCount();
    const orderIds = orders.map((order) => order.id);

    if (orderIds.length === 0) {
      return { orders: [], total, limit, offset };
    }

    const subOrderWhere = {
      masterOrderId: In(orderIds),
      ...(scopedOutletId ? { outletId: scopedOutletId } : {}),
      ...(query.subOrderStatus ? { status: query.subOrderStatus } : {}),
    };
    const subOrders = await this.subOrders.find({
      where: subOrderWhere,
      order: { createdAt: "ASC" },
    });
    const subOrderIds = subOrders.map((subOrder) => subOrder.id);
    const lineItems =
      subOrderIds.length > 0
        ? await this.lineItems.find({
            where: {
              masterOrderId: In(orderIds),
              subOrderId: In(subOrderIds),
              ...(scopedOutletId ? { outletId: scopedOutletId } : {}),
            },
            order: { createdAt: "ASC" },
          })
        : [];

    return {
      orders: orders.map((order) => ({
        order,
        subOrders: subOrders.filter((subOrder) => subOrder.masterOrderId === order.id),
        lineItems: lineItems.filter((lineItem) => lineItem.masterOrderId === order.id),
      })),
      total,
      limit,
      offset,
    };
  }

  async getMine(user: AuthenticatedUser, id: string) {
    const order = await this.requireCustomerOrder(user, id);

    return this.buildOrderDetail(order);
  }

  async reorder(user: AuthenticatedUser, id: string) {
    const order = await this.requireCustomerOrder(user, id);
    const lines = await this.lineItems.find({ where: { masterOrderId: order.id } });
    const input: InitiatePaymentDto = {
      deliveryMode: order.deliveryMode,
      items: lines
        .filter((line) => line.menuItemId)
        .map((line) => ({
          menuItemId: line.menuItemId!,
          quantity: line.quantity,
          modifiers: this.modifierIdsFromSnapshot(line.modifiersSnapshot).map((modifierId) => ({
            modifierId,
          })),
        })),
    };
    if (order.deliveryAddress) {
      input.deliveryAddress = order.deliveryAddress;
    }
    if (order.deliveryLatitude !== null) {
      input.deliveryLatitude = order.deliveryLatitude;
    }
    if (order.deliveryLongitude !== null) {
      input.deliveryLongitude = order.deliveryLongitude;
    }

    return this.payments.initiate(user, input);
  }

  async updateStatus(user: AuthenticatedUser, id: string, input: UpdateOrderStatusDto) {
    if (input.status === MasterOrderStatus.DELIVERED) {
      throw new ForbiddenException("Use the delivery completion code to mark delivery complete");
    }

    const order = await this.requireOperationalOrder(user, id);

    if (user.role === UserRole.RIDER) {
      if (order.riderId && order.riderId !== user.id) {
        throw new ForbiddenException("Cannot update another rider's order");
      }
      order.riderId = order.riderId ?? user.id;
    } else if (input.riderId) {
      order.riderId = input.riderId;
    }

    order.status = input.status;
    await this.masterOrders.save(order);
    await this.recordStatusEvent(order, user.id, input.note ?? null);
    await this.notifyOrderStatus(order);
    this.realtime.emitOrderStatusUpdate({
      masterOrderId: order.id,
      customerId: order.customerId,
      riderId: order.riderId,
      status: order.status,
      updatedAt: order.updatedAt,
    });

    return this.buildOrderDetail(order);
  }

  async completeDelivery(user: AuthenticatedUser, id: string, input: CompleteDeliveryDto) {
    if (user.role !== UserRole.RIDER) {
      throw new ForbiddenException("Only riders can complete deliveries");
    }

    const order = await this.masterOrders.findOneBy({ id });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.riderId && order.riderId !== user.id) {
      throw new ForbiddenException("Cannot complete another rider's order");
    }

    if (!order.deliveryCode || order.deliveryCode !== input.code) {
      throw new ForbiddenException("Invalid delivery completion code");
    }

    order.riderId = order.riderId ?? user.id;
    order.status = MasterOrderStatus.DELIVERED;
    await this.masterOrders.save(order);
    await this.recordStatusEvent(order, user.id, "Delivery completed with customer code");
    await this.notifyOrderStatus(order);
    this.realtime.emitOrderStatusUpdate({
      masterOrderId: order.id,
      customerId: order.customerId,
      riderId: order.riderId,
      status: order.status,
      updatedAt: order.updatedAt,
    });

    return this.buildOrderDetail(order);
  }

  async latestRiderLocation(user: AuthenticatedUser, id: string): Promise<LatestLocation | null> {
    await this.requireCustomerOrder(user, id);

    return this.getLatestRiderLocation(id);
  }

  private async buildOrderDetail(order: MasterOrder) {
    const [subOrders, lineItems, events, latestRiderLocation] = await Promise.all([
      this.subOrders.find({ where: { masterOrderId: order.id }, order: { createdAt: "ASC" } }),
      this.lineItems.find({ where: { masterOrderId: order.id }, order: { createdAt: "ASC" } }),
      this.statusEvents.find({
        where: { masterOrderId: order.id },
        order: { createdAt: "ASC" },
      }),
      this.getLatestRiderLocation(order.id),
    ]);

    return { order, subOrders, lineItems, events, latestRiderLocation };
  }

  private async requireCustomerOrder(user: AuthenticatedUser, id: string): Promise<MasterOrder> {
    const order = await this.masterOrders.findOneBy({ id, customerId: user.id });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return order;
  }

  private async requireOperationalOrder(user: AuthenticatedUser, id: string): Promise<MasterOrder> {
    const order = await this.masterOrders.findOneBy({ id });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.RIDER) {
      return order;
    }

    if (user.role === UserRole.ADMIN) {
      const outletId = await this.requireAdminOutletId(user);

      const subOrder = await this.subOrders.findOneBy({
        masterOrderId: id,
        outletId,
      });

      if (!subOrder) {
        throw new ForbiddenException("Cannot update another outlet's order");
      }

      return order;
    }

    throw new ForbiddenException("Order operations require admin or rider access");
  }

  private async requireAdminOutletId(user: AuthenticatedUser): Promise<string> {
    const admin = await this.users.findOne({
      where: { id: user.id, role: UserRole.ADMIN },
      select: { id: true, outletId: true },
    });

    if (!admin?.outletId) {
      throw new ForbiddenException("Outlet admin is not linked to an outlet");
    }

    return admin.outletId;
  }

  private async recordStatusEvent(
    order: MasterOrder,
    actorId: string | null,
    note: string | null,
  ): Promise<void> {
    await this.statusEvents.save(
      this.statusEvents.create({
        masterOrderId: order.id,
        masterStatus: order.status,
        actorId,
        note,
      }),
    );
  }

  private async notifyOrderStatus(order: MasterOrder): Promise<void> {
    await this.notifications.createAndPush({
      recipientId: order.customerId,
      recipientRole: UserRole.CUSTOMER,
      type: "ORDER_STATUS",
      title: "Order status updated",
      body: `Your order is now ${order.status.replaceAll("_", " ").toLowerCase()}.`,
    });
  }

  private async getLatestRiderLocation(id: string): Promise<LatestLocation | null> {
    const rows = await this.dataSource.query<LatestLocation[]>(
      `
        SELECT
          rider_id AS "riderId",
          master_order_id AS "masterOrderId",
          ST_Y(geom) AS "latitude",
          ST_X(geom) AS "longitude",
          recorded_at AS "recordedAt"
        FROM rider_locations
        WHERE master_order_id = $1
        ORDER BY recorded_at DESC
        LIMIT 1
      `,
      [id],
    );

    return rows[0] ?? null;
  }

  private modifierIdsFromSnapshot(snapshot: unknown[]): string[] {
    return snapshot
      .map((modifier) =>
        typeof modifier === "object" && modifier !== null && "id" in modifier
          ? String(modifier.id)
          : null,
      )
      .filter((id): id is string => Boolean(id));
  }
}
