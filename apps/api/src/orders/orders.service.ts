import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Customer } from "../auth/customer.entity";
import { UserRole } from "../auth/user-role.enum";
import { NotificationsService } from "../notifications/notifications.service";
import { Outlet } from "../outlets/outlet.entity";
import { RealtimeService } from "../realtime/realtime.service";
import type { InitiatePaymentDto } from "../payments/dto/payment.dto";
import { PaymentsService } from "../payments/payments.service";
import { MasterOrder } from "./master-order.entity";
import { OrderLineItem } from "./order-line-item.entity";
import { MasterOrderStatus, SubOrderStatus } from "./order-status.enum";
import { OrderStatusEvent } from "./order-status-event.entity";
import { SubOrder } from "./sub-order.entity";
import type {
  AssignOrderRiderDto,
  CompleteDeliveryDto,
  ListAdminOrdersQueryDto,
  PickupSubOrderDto,
  RejectAssignedOrderDto,
  RiderCollectSubOrderDto,
  UpdateOrderStatusDto,
  VerifyPickupCodeDto,
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

export interface RiderDispatch {
  orderId: string;
  status: MasterOrderStatus;
  deliveryCodeRequired: true;
  deliveryAddress: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  customerId: string;
  riderId: string | null;
  outlets: Array<{
    subOrderId: string;
    outletId: string;
    outletName: string;
    pickupAddress: string | null;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
    pickupCode: string;
    status: SubOrderStatus;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      modifiers: unknown[];
    }>;
  }>;
}

interface FairAvailableRiderRow {
  id: string;
  assignmentCount: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Customer) private readonly users: Repository<Customer>,
    @InjectRepository(Outlet) private readonly outlets: Repository<Outlet>,
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

    if (user.role === UserRole.ADMIN) {
      return this.updateOutletSubOrderStatus(user, id, input);
    }

    const order = await this.requireOperationalOrder(user, id);

    if (user.role === UserRole.RIDER) {
      if (order.riderId && order.riderId !== user.id) {
        throw new ForbiddenException("Cannot update another rider's order");
      }
      order.riderId = order.riderId ?? user.id;
    }

    order.status = input.status;
    await this.masterOrders.save(order);
    await this.autoAssignRiderIfReady(order, user);
    await this.recordStatusEvent(order, user.id, input.note ?? null);
    await this.notifyOrderStatus(order);
    this.realtime.emitOrderStatusUpdate({
      masterOrderId: order.id,
      customerId: order.customerId,
      riderId: order.riderId,
      status: order.status,
      updatedAt: order.updatedAt,
      ...(input.status === MasterOrderStatus.OUT_FOR_DELIVERY
        ? { riderLocationTracking: "START" as const }
        : {}),
    });

    return this.buildOrderDetail(order);
  }

  async assignRider(user: AuthenticatedUser, id: string, input: AssignOrderRiderDto) {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only admins can assign riders");
    }

    const order = await this.requireOperationalOrder(user, id);
    await this.assignFairRider(
      user,
      order,
      input.note ?? "Available rider assigned fairly",
      [],
      true,
    );
    this.realtime.emitOrderStatusUpdate({
      masterOrderId: order.id,
      customerId: order.customerId,
      riderId: order.riderId,
      status: order.status,
      updatedAt: order.updatedAt,
    });

    return this.buildOrderDetail(order);
  }

  async listAssignedDispatches(user: AuthenticatedUser): Promise<RiderDispatch[]> {
    if (user.role !== UserRole.RIDER) {
      throw new ForbiddenException("Only riders can view assigned orders");
    }

    const orders = await this.masterOrders.find({
      where: {
        riderId: user.id,
        status: In([
          MasterOrderStatus.CONFIRMED,
          MasterOrderStatus.PARTIALLY_READY,
          MasterOrderStatus.READY,
          MasterOrderStatus.OUT_FOR_DELIVERY,
        ]),
      },
      order: { createdAt: "DESC" },
      take: 50,
    });

    return Promise.all(orders.map((order) => this.buildRiderDispatch(order)));
  }

  async rejectAssignedOrder(user: AuthenticatedUser, id: string, input: RejectAssignedOrderDto) {
    if (user.role !== UserRole.RIDER) {
      throw new ForbiddenException("Only riders can reject assigned orders");
    }

    const order = await this.masterOrders.findOneBy({ id });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.riderId !== user.id) {
      throw new ForbiddenException("Cannot reject another rider's order");
    }

    if (
      order.status === MasterOrderStatus.DELIVERED ||
      order.status === MasterOrderStatus.CANCELLED
    ) {
      throw new BadRequestException("Completed or cancelled orders cannot be rejected");
    }

    const rejectedRiderId = order.riderId;
    order.riderId = null;
    await this.masterOrders.save(order);
    await this.recordStatusEvent(order, user.id, `Rider rejected assignment: ${input.reason}`);

    const reassignment = await this.assignFairRider(
      user,
      order,
      `Auto reassigned after rider rejection: ${input.reason}`,
      [rejectedRiderId],
      false,
    );

    this.realtime.emitOrderStatusUpdate({
      masterOrderId: order.id,
      customerId: order.customerId,
      riderId: reassignment?.riderId ?? rejectedRiderId,
      status: order.status,
      updatedAt: order.updatedAt,
    });

    return {
      rejected: true,
      reassigned: Boolean(reassignment),
      previousRiderId: rejectedRiderId,
      riderId: order.riderId,
      order: await this.buildOrderDetail(order),
    };
  }

  async getDispatch(user: AuthenticatedUser, id: string): Promise<RiderDispatch> {
    const order = await this.masterOrders.findOneBy({ id });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (user.role === UserRole.RIDER) {
      if (order.riderId !== user.id) {
        throw new ForbiddenException("Cannot view another rider's dispatch");
      }
    } else {
      await this.requireOperationalOrder(user, id);
    }

    return this.buildRiderDispatch(order);
  }

  async pickupSubOrder(
    user: AuthenticatedUser,
    id: string,
    subOrderId: string,
    input: PickupSubOrderDto,
  ) {
    if (user.role !== UserRole.RIDER) {
      throw new ForbiddenException("Only riders can confirm pickups");
    }

    const order = await this.masterOrders.findOneBy({ id });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.riderId && order.riderId !== user.id) {
      throw new ForbiddenException("Cannot pick up another rider's order");
    }

    const subOrder = await this.subOrders.findOneBy({ id: subOrderId, masterOrderId: id });

    if (!subOrder) {
      throw new NotFoundException("Sub-order not found");
    }

    if (subOrder.status === SubOrderStatus.REJECTED) {
      throw new BadRequestException("Rejected sub-orders cannot be picked up");
    }

    order.riderId = order.riderId ?? user.id;
    subOrder.status = SubOrderStatus.COLLECTED;
    await this.subOrders.save(subOrder);

    const subOrders = await this.subOrders.find({ where: { masterOrderId: order.id } });
    const derivedStatus = this.deriveMasterStatus(subOrders);

    if (derivedStatus !== order.status || order.riderId === user.id) {
      order.status = derivedStatus;
      await this.masterOrders.save(order);
    }

    await this.recordStatusEvent(
      order,
      user.id,
      input.note ?? "Sub-order pickup confirmed",
      subOrder,
    );
    await this.notifyOrderStatus(order);
    this.realtime.emitOrderStatusUpdate({
      masterOrderId: order.id,
      customerId: order.customerId,
      riderId: order.riderId,
      status: order.status,
      updatedAt: order.updatedAt,
      ...(order.status === MasterOrderStatus.OUT_FOR_DELIVERY
        ? { riderLocationTracking: "START" as const }
        : {}),
    });

    return this.buildOrderDetail(order);
  }

  private async updateOutletSubOrderStatus(
    user: AuthenticatedUser,
    id: string,
    input: UpdateOrderStatusDto,
  ) {
    const outletId = await this.requireAdminOutletId(user);
    const subOrder =
      (await this.subOrders.findOneBy({ id, outletId })) ??
      (await this.subOrders.findOneBy({ masterOrderId: id, outletId }));

    if (!subOrder) {
      throw new NotFoundException("Order not found");
    }

    const order = await this.masterOrders.findOneBy({ id: subOrder.masterOrderId });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    subOrder.status = this.toSubOrderStatus(input.status);
    await this.subOrders.save(subOrder);

    const subOrders = await this.subOrders.find({ where: { masterOrderId: order.id } });
    const derivedStatus = this.deriveMasterStatus(subOrders);

    if (derivedStatus !== order.status) {
      order.status = derivedStatus;
      await this.masterOrders.save(order);
    }

    await this.recordStatusEvent(order, user.id, input.note ?? null, subOrder);
    await this.autoAssignRiderIfReady(order, user);
    await this.notifyOrderStatus(order);
    this.realtime.emitOrderStatusUpdate({
      masterOrderId: order.id,
      customerId: order.customerId,
      riderId: order.riderId,
      status: order.status,
      updatedAt: order.updatedAt,
      riderLocationTracking: "STOP",
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

  /**
   * Outlet-admin verifies a customer walk-in pickup.
   * Finds the READY sub-order for this outlet matching the code → COLLECTED.
   */
  async verifyOutletHandoff(user: AuthenticatedUser, input: VerifyPickupCodeDto) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only outlet admins can verify customer handoffs");
    }

    const outletId = await this.requireAdminOutletId(user);
    const subOrder = await this.subOrders.findOneBy({ outletId, pickupCode: input.code });

    if (!subOrder) {
      throw new NotFoundException("No order found for that pickup code");
    }

    if (subOrder.status !== SubOrderStatus.READY) {
      throw new BadRequestException(
        `Sub-order is not ready for pickup (current status: ${subOrder.status})`,
      );
    }

    const order = await this.masterOrders.findOneBy({ id: subOrder.masterOrderId });

    if (!order) {
      throw new NotFoundException("Master order not found");
    }

    subOrder.status = SubOrderStatus.COLLECTED;
    await this.subOrders.save(subOrder);

    const subOrders = await this.subOrders.find({ where: { masterOrderId: order.id } });
    const derivedStatus = this.deriveMasterStatus(subOrders);

    if (derivedStatus !== order.status) {
      order.status = derivedStatus;
      await this.masterOrders.save(order);
    }

    await this.recordStatusEvent(order, user.id, "Customer walk-in pickup verified", subOrder);
    await this.notifyOrderStatus(order);
    this.realtime.emitOrderStatusUpdate({
      masterOrderId: order.id,
      customerId: order.customerId,
      riderId: order.riderId,
      status: order.status,
      updatedAt: order.updatedAt,
    });

    return {
      verified: true,
      subOrderId: subOrder.id,
      masterOrderId: order.id,
      masterStatus: order.status,
    };
  }

  /**
   * Outlet-admin verifies a rider arriving to collect an order.
   * Finds the READY sub-order for this outlet matching the code → DISPATCHED.
   * Master order becomes OUT_FOR_DELIVERY when all non-rejected sub-orders are dispatched/collected.
   */
  async riderCollectSubOrderByCode(user: AuthenticatedUser, input: RiderCollectSubOrderDto) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only outlet admins can verify rider collection");
    }

    const outletId = await this.requireAdminOutletId(user);
    const subOrder = await this.subOrders.findOneBy({ outletId, pickupCode: input.code });

    if (!subOrder) {
      throw new NotFoundException("No order found for that pickup code");
    }

    if (subOrder.status !== SubOrderStatus.READY) {
      throw new BadRequestException(
        `Sub-order is not ready for collection (current status: ${subOrder.status})`,
      );
    }

    const order = await this.masterOrders.findOneBy({ id: subOrder.masterOrderId });

    if (!order) {
      throw new NotFoundException("Master order not found");
    }

    subOrder.status = SubOrderStatus.DISPATCHED;
    await this.subOrders.save(subOrder);

    const subOrders = await this.subOrders.find({ where: { masterOrderId: order.id } });
    const derivedStatus = this.deriveMasterStatus(subOrders);

    if (derivedStatus !== order.status) {
      order.status = derivedStatus;
      await this.masterOrders.save(order);
    }

    await this.recordStatusEvent(
      order,
      user.id,
      input.note ?? "Rider collected sub-order from outlet",
      subOrder,
    );
    await this.notifyOrderStatus(order);
    this.realtime.emitOrderStatusUpdate({
      masterOrderId: order.id,
      customerId: order.customerId,
      riderId: order.riderId,
      status: order.status,
      updatedAt: order.updatedAt,
      ...(order.status === MasterOrderStatus.OUT_FOR_DELIVERY
        ? { riderLocationTracking: "START" as const }
        : {}),
    });

    return {
      collected: true,
      subOrderId: subOrder.id,
      masterOrderId: order.id,
      masterStatus: order.status,
    };
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

  private async buildRiderDispatch(order: MasterOrder): Promise<RiderDispatch> {
    const [subOrders, lineItems] = await Promise.all([
      this.subOrders.find({ where: { masterOrderId: order.id }, order: { createdAt: "ASC" } }),
      this.lineItems.find({ where: { masterOrderId: order.id }, order: { createdAt: "ASC" } }),
    ]);
    const outlets = subOrders.length
      ? await this.outlets.findBy({ id: In(subOrders.map((subOrder) => subOrder.outletId)) })
      : [];
    const outletById = new Map(outlets.map((outlet) => [outlet.id, outlet]));

    return {
      orderId: order.id,
      status: order.status,
      deliveryCodeRequired: true,
      deliveryAddress: order.deliveryAddress,
      deliveryLatitude: order.deliveryLatitude,
      deliveryLongitude: order.deliveryLongitude,
      customerId: order.customerId,
      riderId: order.riderId,
      outlets: subOrders.map((subOrder) => {
        const outlet = outletById.get(subOrder.outletId);

        return {
          subOrderId: subOrder.id,
          outletId: subOrder.outletId,
          outletName: outlet?.name ?? "Outlet",
          pickupAddress: outlet?.address ?? null,
          pickupLatitude: outlet?.latitude ?? null,
          pickupLongitude: outlet?.longitude ?? null,
          pickupCode: subOrder.pickupCode,
          status: subOrder.status,
          items: lineItems
            .filter((lineItem) => lineItem.subOrderId === subOrder.id)
            .map((lineItem) => ({
              id: lineItem.id,
              name: lineItem.itemNameSnapshot,
              quantity: lineItem.quantity,
              modifiers: lineItem.modifiersSnapshot,
            })),
        };
      }),
    };
  }

  private formatDispatchNotificationBody(dispatch: RiderDispatch): string {
    const outletSummary = dispatch.outlets
      .map((outlet) => `${outlet.outletName} (${outlet.pickupCode})`)
      .join(", ");
    const dropOff = dispatch.deliveryAddress ?? "customer drop-off";

    return `Order ${dispatch.orderId}: pick up from ${outletSummary}. Drop off: ${dropOff}.`;
  }

  private async assignFairRider(
    actor: AuthenticatedUser,
    order: MasterOrder,
    note: string,
    excludedRiderIds: string[] = [],
    throwWhenUnavailable = true,
  ): Promise<{ riderId: string; dispatch: RiderDispatch } | null> {
    let rider: FairAvailableRiderRow;

    try {
      rider = await this.findFairAvailableRider(actor, order, excludedRiderIds);
    } catch (error) {
      if (!throwWhenUnavailable && error instanceof NotFoundException) {
        return null;
      }

      throw error;
    }

    order.riderId = rider.id;
    await this.masterOrders.save(order);
    await this.recordStatusEvent(
      order,
      actor.id,
      `${note} (${rider.assignmentCount} recent assignments)`,
    );

    const dispatch = await this.buildRiderDispatch(order);
    await this.notifications.createAndPush({
      recipientId: rider.id,
      recipientRole: UserRole.RIDER,
      type: "ORDER_ASSIGNMENT",
      title: "New delivery assigned",
      body: this.formatDispatchNotificationBody(dispatch),
      data: {
        deepLink: `rsc://rider/dispatch/${order.id}`,
        masterOrderId: order.id,
        pickupCodes: dispatch.outlets.map((outlet) => outlet.pickupCode).join(","),
        outletNames: dispatch.outlets.map((outlet) => outlet.outletName).join(", "),
        dropOff: {
          address: dispatch.deliveryAddress,
          latitude: dispatch.deliveryLatitude,
          longitude: dispatch.deliveryLongitude,
        },
        outlets: dispatch.outlets.map((outlet) => ({
          subOrderId: outlet.subOrderId,
          outletId: outlet.outletId,
          name: outlet.outletName,
          address: outlet.pickupAddress,
          latitude: outlet.pickupLatitude,
          longitude: outlet.pickupLongitude,
          pickupCode: outlet.pickupCode,
        })),
      },
    });

    return { riderId: rider.id, dispatch };
  }

  private async autoAssignRiderIfReady(
    order: MasterOrder,
    actor: AuthenticatedUser,
  ): Promise<{ riderId: string; dispatch: RiderDispatch } | null> {
    if (
      order.riderId ||
      order.deliveryMode !== "DELIVERY" ||
      order.status !== MasterOrderStatus.READY
    ) {
      return null;
    }

    return this.assignFairRider(
      { ...actor, role: UserRole.SUPER_ADMIN },
      order,
      "Auto assigned when order became ready",
      [],
      false,
    );
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

  private async findFairAvailableRider(
    user: AuthenticatedUser,
    order: MasterOrder,
    excludedRiderIds: string[] = [],
  ): Promise<FairAvailableRiderRow> {
    if (order.deliveryMode !== "DELIVERY") {
      throw new BadRequestException("Riders can only be assigned to delivery orders");
    }

    const params: Array<string | string[]> = [
      [MasterOrderStatus.DELIVERED, MasterOrderStatus.CANCELLED],
      ["AVAILABLE", "ACTIVE"],
    ];
    let outletFilter = "";
    let excludedRiderFilter = "";

    if (user.role === UserRole.ADMIN) {
      const outletId = await this.requireAdminOutletId(user);

      const subOrder = await this.subOrders.findOneBy({
        masterOrderId: order.id,
        outletId,
      });

      if (!subOrder) {
        throw new ForbiddenException("Cannot assign rider to another outlet's order");
      }

      params.push(outletId);
      outletFilter = `AND u.outlet_id = $${params.length}`;
    }

    if (excludedRiderIds.length > 0) {
      params.push(excludedRiderIds);
      excludedRiderFilter = `AND u.id <> ALL($${params.length}::uuid[])`;
    }

    const rows = await this.dataSource.query<FairAvailableRiderRow[]>(
      `
        SELECT
          u.id,
          COUNT(recent_orders.id)::integer AS "assignmentCount"
        FROM users u
        LEFT JOIN master_orders recent_orders
          ON recent_orders.rider_id = u.id
          AND recent_orders.created_at >= NOW() - INTERVAL '24 hours'
          AND recent_orders.status <> 'CANCELLED'
          AND recent_orders.deleted_at IS NULL
        WHERE u.role = 'RIDER'
          AND u.status = 'ACTIVE'
          AND u.rider_status = ANY($2)
          AND u.deleted_at IS NULL
          ${outletFilter}
          ${excludedRiderFilter}
          AND NOT EXISTS (
            SELECT 1
            FROM master_orders active_orders
            WHERE active_orders.rider_id = u.id
              AND active_orders.status <> ALL($1)
              AND active_orders.deleted_at IS NULL
          )
        GROUP BY u.id, u.created_at
        ORDER BY "assignmentCount" ASC, MAX(recent_orders.created_at) ASC NULLS FIRST, u.created_at ASC
        LIMIT 1
      `,
      params,
    );

    const rider = rows[0];

    if (!rider) {
      throw new NotFoundException("No available free rider was found");
    }

    return rider;
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

  private toSubOrderStatus(status: MasterOrderStatus): SubOrderStatus {
    const statusMap: Record<MasterOrderStatus, SubOrderStatus> = {
      [MasterOrderStatus.PENDING_PAYMENT]: SubOrderStatus.PENDING,
      [MasterOrderStatus.CONFIRMED]: SubOrderStatus.ACCEPTED,
      [MasterOrderStatus.PARTIALLY_READY]: SubOrderStatus.READY,
      [MasterOrderStatus.READY]: SubOrderStatus.READY,
      [MasterOrderStatus.OUT_FOR_DELIVERY]: SubOrderStatus.DISPATCHED,
      [MasterOrderStatus.DELIVERED]: SubOrderStatus.COLLECTED,
      [MasterOrderStatus.CANCELLED]: SubOrderStatus.REJECTED,
    };

    return statusMap[status];
  }

  private deriveMasterStatus(subOrders: SubOrder[]): MasterOrderStatus {
    if (subOrders.length === 0) {
      return MasterOrderStatus.CONFIRMED;
    }

    if (subOrders.every((subOrder) => subOrder.status === SubOrderStatus.REJECTED)) {
      return MasterOrderStatus.CANCELLED;
    }

    if (
      subOrders.every(
        (subOrder) =>
          subOrder.status === SubOrderStatus.DISPATCHED ||
          subOrder.status === SubOrderStatus.COLLECTED,
      )
    ) {
      return MasterOrderStatus.OUT_FOR_DELIVERY;
    }

    if (subOrders.every((subOrder) => subOrder.status === SubOrderStatus.READY)) {
      return MasterOrderStatus.READY;
    }

    if (
      subOrders.some(
        (subOrder) =>
          subOrder.status === SubOrderStatus.READY ||
          subOrder.status === SubOrderStatus.COLLECTED ||
          subOrder.status === SubOrderStatus.DISPATCHED,
      )
    ) {
      return MasterOrderStatus.PARTIALLY_READY;
    }

    return MasterOrderStatus.CONFIRMED;
  }

  private async recordStatusEvent(
    order: MasterOrder,
    actorId: string | null,
    note: string | null,
    subOrder?: SubOrder,
  ): Promise<void> {
    await this.statusEvents.save(
      this.statusEvents.create({
        masterOrderId: order.id,
        subOrderId: subOrder?.id ?? null,
        masterStatus: order.status,
        subOrderStatus: subOrder?.status ?? null,
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
