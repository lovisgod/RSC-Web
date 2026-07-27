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
import { isOperationalAdminRole, isPlatformAdminRole, UserRole } from "../auth/user-role.enum";
import { NotificationsService } from "../notifications/notifications.service";
import { Outlet } from "../outlets/outlet.entity";
import { RealtimeService } from "../realtime/realtime.service";
import type { InitiatePaymentDto } from "../payments/dto/payment.dto";
import { PaymentsService } from "../payments/payments.service";
import { PiiCryptoService } from "../common/security/pii-crypto.service";
import { MasterOrder } from "./master-order.entity";
import { OrderLineItem } from "./order-line-item.entity";
import { MasterOrderStatus, SubOrderStatus } from "./order-status.enum";
import { OrderStatusEvent } from "./order-status-event.entity";
import { SubOrder } from "./sub-order.entity";
import type {
  AssignOrderRiderDto,
  CompleteDeliveryDto,
  ListAdminOrdersQueryDto,
  ListCustomerOrdersQueryDto,
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
    subOrders: SerializedSubOrder[];
    lineItems: OrderLineItem[];
  }>;
  total: number;
  totalSubOrders: number;
  limit: number;
  offset: number;
  next: number | null;
  previous: number | null;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CustomerOrderListResult {
  orders: CustomerOrderView[];
  total: number;
  limit: number;
  offset: number;
  next: number | null;
  previous: number | null;
  hasNext: boolean;
  hasPrevious: boolean;
}

type CustomerSplitKind = "FULFILLED" | "FAILED";

type CustomerOrderView = MasterOrder & {
  customerViewId?: string;
  sourceMasterOrderId?: string;
  splitKind?: CustomerSplitKind;
  refundSubOrderIds?: string[];
  refundableMinor?: number;
};

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
    preparationNote: string | null;
    rejectionReason: string | null;
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

type SerializedSubOrder = SubOrder & { rejectionReason: string | null };

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
    private readonly piiCrypto: PiiCryptoService,
  ) {}

  async listMine(
    user: AuthenticatedUser,
    query: ListCustomerOrdersQueryDto = {},
  ): Promise<CustomerOrderListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const [orders, total] = await this.masterOrders.findAndCount({
      where: { customerId: user.id },
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });

    const subOrders =
      orders.length > 0
        ? await this.subOrders.find({
            where: { masterOrderId: In(orders.map((order) => order.id)) },
            order: { createdAt: "ASC" },
          })
        : [];
    const projectedOrders = orders.flatMap((order) =>
      this.projectCustomerOrderListItem(
        order,
        subOrders.filter((subOrder) => subOrder.masterOrderId === order.id),
      ),
    );
    const projectedTotal = total + projectedOrders.length - orders.length;

    return {
      orders: projectedOrders,
      total: projectedTotal,
      limit,
      offset,
      ...paginationMeta(projectedTotal, limit, offset),
    };
  }

  async listAdmin(
    user: AuthenticatedUser,
    query: ListAdminOrdersQueryDto,
  ): Promise<AdminOrderListResult> {
    if (!isOperationalAdminRole(user.role)) {
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
      return {
        orders: [],
        total,
        totalSubOrders: 0,
        limit,
        offset,
        ...paginationMeta(total, limit, offset),
      };
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
        order: this.withTakeoutPickupCode(
          order,
          subOrders.filter((subOrder) => subOrder.masterOrderId === order.id),
        ),
        subOrders: subOrders
          .filter((subOrder) => subOrder.masterOrderId === order.id)
          .map((subOrder) => this.serializeSubOrder(subOrder)),
        lineItems: lineItems.filter((lineItem) => lineItem.masterOrderId === order.id),
      })),
      total,
      totalSubOrders: subOrders.length,
      limit,
      offset,
      ...paginationMeta(total, limit, offset),
    };
  }

  async getMine(user: AuthenticatedUser, id: string) {
    const customerView = this.parseCustomerViewId(id);
    const order = await this.requireCustomerOrder(user, customerView.sourceMasterOrderId);

    return this.buildOrderDetail(order, customerView.splitKind);
  }

  async reorder(user: AuthenticatedUser, id: string) {
    const order = await this.requireCustomerOrder(user, id);
    const lines = await this.lineItems.find({ where: { masterOrderId: order.id } });
    const subOrders = await this.subOrders.find({ where: { masterOrderId: order.id } });
    const platformCommissionMinor = subOrders.reduce((sum, so) => sum + so.commissionMinor, 0);

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
          ...(line.customerNote ? { customerNote: line.customerNote } : {}),
        })),
      subtotalMinor: order.subtotalMinor,
      deliveryFeeMinor: order.deliveryFeeMinor,
      serviceFeeMinor: order.serviceFeeMinor,
      vatMinor: order.vatMinor,
      platformCommissionMinor,
      totalMinor: order.totalMinor,
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

    return input;
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

    if (input.preparationTime !== undefined) {
      order.preparationTime = input.preparationTime;
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
    if (!isOperationalAdminRole(user.role)) {
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

  async assignOldestReadyOrderToRider(
    rider: AuthenticatedUser & { outletId?: string | null },
  ): Promise<{ riderId: string; dispatch: RiderDispatch } | null> {
    if (rider.role !== UserRole.RIDER) {
      throw new ForbiddenException("Only riders can receive rider assignments");
    }

    const candidate = await this.findOldestReadyUnassignedOrderForRider(rider.id, rider.outletId);
    if (!candidate) {
      return null;
    }

    const order = await this.masterOrders.findOneBy({ id: candidate.orderId });
    if (!order || order.riderId) {
      return null;
    }

    const assignment = await this.assignSelectedRider(
      rider,
      order,
      { id: rider.id, assignmentCount: candidate.assignmentCount },
      "Auto assigned when rider became available",
    );
    this.realtime.emitOrderStatusUpdate({
      masterOrderId: order.id,
      customerId: order.customerId,
      riderId: order.riderId,
      status: order.status,
      updatedAt: order.updatedAt,
    });

    return assignment;
  }

  async listAssignedDispatches(user: AuthenticatedUser): Promise<RiderDispatch[]> {
    if (user.role !== UserRole.RIDER) {
      throw new ForbiddenException("Only riders can view assigned orders");
    }

    const orders = await this.masterOrders.find({
      where: {
        riderId: user.id,
        status: In([
          MasterOrderStatus.PARTIALLY_FULFILLED,
          MasterOrderStatus.READY,
          MasterOrderStatus.OUT_FOR_DELIVERY,
        ]),
      },
      order: { createdAt: "DESC" },
      take: 50,
    });
    const dispatches = await Promise.all(
      orders.map(async (order) => ({
        order,
        subOrders: await this.subOrders.find({ where: { masterOrderId: order.id } }),
      })),
    );
    const visibleOrders = dispatches
      .filter(({ order, subOrders }) => this.isRiderDispatchVisible(order, subOrders))
      .map(({ order }) => order);

    return Promise.all(visibleOrders.map((order) => this.buildRiderDispatch(order)));
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
    if (input.preparationTime !== undefined) {
      subOrder.preparationTime = input.preparationTime;
    }
    if (subOrder.status === SubOrderStatus.REJECTED && input.rejectionReason) {
      subOrder.preparationNote = input.rejectionReason;
    }
    await this.subOrders.save(subOrder);

    const subOrders = await this.subOrders.find({ where: { masterOrderId: order.id } });
    const derivedStatus = this.deriveMasterStatus(subOrders);

    const prepTimes = subOrders
      .map((so) => so.preparationTime)
      .filter((t): t is number => t !== null && typeof t === "number" && !isNaN(t));
    const newPrepTime = prepTimes.length ? Math.max(...prepTimes) : null;

    let orderChanged = false;
    if ((order.preparationTime ?? null) !== newPrepTime) {
      order.preparationTime = newPrepTime;
      orderChanged = true;
    }

    if (derivedStatus !== order.status) {
      order.status = derivedStatus;
      orderChanged = true;
    }

    if (orderChanged) {
      await this.masterOrders.save(order);
    }

    const eventNote =
      subOrder.status === SubOrderStatus.REJECTED && input.rejectionReason
        ? `Rejection Reason: ${input.rejectionReason}`
        : (input.note ?? null);
    await this.recordStatusEvent(order, user.id, eventNote, subOrder);
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

    const subOrders = await this.subOrders.find({ where: { masterOrderId: order.id } });
    const deliverableSubOrders = subOrders.filter(
      (subOrder) => subOrder.status !== SubOrderStatus.REJECTED,
    );
    const incompleteSubOrders = deliverableSubOrders.filter(
      (subOrder) => subOrder.status !== SubOrderStatus.COLLECTED,
    );

    for (const subOrder of incompleteSubOrders) {
      if (subOrder.status !== SubOrderStatus.DISPATCHED) {
        throw new BadRequestException(
          `Sub-order is not out for delivery (current status: ${subOrder.status})`,
        );
      }

      subOrder.status = SubOrderStatus.COLLECTED;
      await this.subOrders.save(subOrder);
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

  private async buildOrderDetail(order: MasterOrder, splitKind?: CustomerSplitKind) {
    const [subOrders, lineItems, events, latestRiderLocation] = await Promise.all([
      this.subOrders.find({ where: { masterOrderId: order.id }, order: { createdAt: "ASC" } }),
      this.lineItems.find({ where: { masterOrderId: order.id }, order: { createdAt: "ASC" } }),
      this.statusEvents.find({
        where: { masterOrderId: order.id },
        order: { createdAt: "ASC" },
      }),
      this.getLatestRiderLocation(order.id),
    ]);
    const derivedStatus = this.deriveMasterStatus(subOrders);
    const effectiveOrder =
      derivedStatus !== order.status &&
      order.status !== MasterOrderStatus.PENDING_PAYMENT &&
      (order.status !== MasterOrderStatus.CANCELLED ||
        derivedStatus === MasterOrderStatus.CANCELLED)
        ? Object.assign(new MasterOrder(), order, {
            status: derivedStatus,
          })
        : order;

    let rider = null;
    if (order.riderId) {
      const riderUser = await this.users.findOneBy({ id: order.riderId });
      if (riderUser) {
        rider = {
          id: riderUser.id,
          name: riderUser.name,
          phone: this.piiCrypto.decrypt(riderUser.phoneEncrypted),
          email: this.piiCrypto.decrypt(riderUser.emailEncrypted),
          avatarUrl: riderUser.avatarUrl,
          vehicleType: riderUser.vehicleType,
          plateNumber: riderUser.plateNumber,
        };
      }
    }

    const projectedOrder = splitKind
      ? this.projectCustomerOrderDetail(effectiveOrder, subOrders, splitKind)
      : effectiveOrder;
    const visibleSubOrders = splitKind
      ? this.filterSubOrdersForCustomerSplit(subOrders, splitKind)
      : subOrders;
    const customerOrder = this.withTakeoutPickupCode(projectedOrder, visibleSubOrders);
    const visibleSubOrderIds = new Set(visibleSubOrders.map((subOrder) => subOrder.id));
    const visibleLineItems = splitKind
      ? lineItems.filter((lineItem) => visibleSubOrderIds.has(lineItem.subOrderId))
      : lineItems;
    const visibleEvents = splitKind
      ? events.filter(
          (event) => event.subOrderId === null || visibleSubOrderIds.has(event.subOrderId),
        )
      : events;

    return {
      order: customerOrder,
      subOrders: visibleSubOrders.map((subOrder) => this.serializeSubOrder(subOrder)),
      lineItems: visibleLineItems,
      events: visibleEvents,
      latestRiderLocation,
      rider,
    };
  }

  private parseCustomerViewId(id: string): {
    sourceMasterOrderId: string;
    splitKind?: CustomerSplitKind;
  } {
    const [sourceMasterOrderId, rawSplitKind] = id.split(":");
    const parsedSourceMasterOrderId = sourceMasterOrderId || id;

    if (rawSplitKind === "fulfilled") {
      return { sourceMasterOrderId: parsedSourceMasterOrderId, splitKind: "FULFILLED" };
    }

    if (rawSplitKind === "failed") {
      return { sourceMasterOrderId: parsedSourceMasterOrderId, splitKind: "FAILED" };
    }

    return { sourceMasterOrderId: id };
  }

  private projectCustomerOrderListItem(
    order: MasterOrder,
    subOrders: SubOrder[],
  ): CustomerOrderView[] {
    if (!this.shouldSplitForCustomer(order, subOrders)) {
      return [this.withCustomerViewMetadata(order, subOrders)];
    }

    return [
      this.projectCustomerOrderDetail(order, subOrders, "FULFILLED"),
      this.projectCustomerOrderDetail(order, subOrders, "FAILED"),
    ];
  }

  private projectCustomerOrderDetail(
    order: MasterOrder,
    subOrders: SubOrder[],
    splitKind: CustomerSplitKind,
  ): CustomerOrderView {
    const visibleSubOrders = this.filterSubOrdersForCustomerSplit(subOrders, splitKind);
    const totals = this.customerSplitTotals(order, visibleSubOrders, splitKind);

    return {
      ...order,
      id: `${order.id}:${splitKind === "FULFILLED" ? "fulfilled" : "failed"}`,
      sourceMasterOrderId: order.id,
      customerViewId: `${order.id}:${splitKind === "FULFILLED" ? "fulfilled" : "failed"}`,
      splitKind,
      status: splitKind === "FULFILLED" ? MasterOrderStatus.DELIVERED : MasterOrderStatus.CANCELLED,
      subtotalMinor: totals.subtotalMinor,
      deliveryFeeMinor: totals.deliveryFeeMinor,
      serviceFeeMinor: totals.serviceFeeMinor,
      vatMinor: totals.vatMinor,
      discountMinor: totals.discountMinor,
      totalMinor: totals.totalMinor,
      deliveryCode: splitKind === "FAILED" ? null : order.deliveryCode,
      refundSubOrderIds:
        splitKind === "FAILED" ? visibleSubOrders.map((subOrder) => subOrder.id) : [],
      refundableMinor: splitKind === "FAILED" ? totals.totalMinor : 0,
    };
  }

  private withCustomerViewMetadata(order: MasterOrder, subOrders: SubOrder[]): CustomerOrderView {
    return this.withTakeoutPickupCode(
      {
        ...order,
        customerViewId: order.id,
        sourceMasterOrderId: order.id,
        refundSubOrderIds:
          order.status === MasterOrderStatus.CANCELLED
            ? subOrders.map((subOrder) => subOrder.id)
            : [],
        refundableMinor: order.status === MasterOrderStatus.CANCELLED ? order.totalMinor : 0,
      },
      subOrders,
    );
  }

  private withTakeoutPickupCode<T extends MasterOrder>(order: T, subOrders: SubOrder[]): T {
    if (order.deliveryMode !== "TAKEOUT" || order.deliveryCode === null) {
      return order;
    }

    const pickupCode =
      subOrders.find((subOrder) => subOrder.status !== SubOrderStatus.REJECTED)?.pickupCode ??
      subOrders[0]?.pickupCode;

    if (!pickupCode) {
      return order;
    }

    return { ...order, deliveryCode: pickupCode };
  }

  private shouldSplitForCustomer(order: MasterOrder, subOrders: SubOrder[]): boolean {
    return (
      order.status === MasterOrderStatus.DELIVERED &&
      subOrders.some((subOrder) => subOrder.status === SubOrderStatus.REJECTED) &&
      subOrders.some((subOrder) => subOrder.status !== SubOrderStatus.REJECTED)
    );
  }

  private filterSubOrdersForCustomerSplit(
    subOrders: SubOrder[],
    splitKind: CustomerSplitKind,
  ): SubOrder[] {
    return subOrders.filter((subOrder) =>
      splitKind === "FAILED"
        ? subOrder.status === SubOrderStatus.REJECTED
        : subOrder.status !== SubOrderStatus.REJECTED,
    );
  }

  private customerSplitTotals(
    order: MasterOrder,
    subOrders: SubOrder[],
    splitKind: CustomerSplitKind,
  ) {
    const subtotalMinor = subOrders.reduce((sum, subOrder) => sum + subOrder.subtotalMinor, 0);
    const commissionMinor = subOrders.reduce((sum, subOrder) => sum + subOrder.commissionMinor, 0);
    const vatMinor = this.allocateBySubtotal(order.vatMinor, subtotalMinor, order.subtotalMinor);
    const discountMinor = this.allocateBySubtotal(
      order.discountMinor,
      subtotalMinor,
      order.subtotalMinor,
    );
    const deliveryFeeMinor = splitKind === "FULFILLED" ? order.deliveryFeeMinor : 0;
    const serviceFeeMinor = splitKind === "FULFILLED" ? order.serviceFeeMinor : 0;
    const totalMinor =
      subtotalMinor +
      commissionMinor +
      vatMinor +
      deliveryFeeMinor +
      serviceFeeMinor -
      discountMinor;

    return {
      subtotalMinor,
      deliveryFeeMinor,
      serviceFeeMinor,
      vatMinor,
      discountMinor,
      totalMinor: Math.max(0, totalMinor),
    };
  }

  private allocateBySubtotal(
    amountMinor: number,
    subtotalMinor: number,
    totalSubtotalMinor: number,
  ) {
    if (amountMinor <= 0 || subtotalMinor <= 0 || totalSubtotalMinor <= 0) {
      return 0;
    }

    return Math.round((amountMinor * subtotalMinor) / totalSubtotalMinor);
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
          preparationNote: subOrder.preparationNote,
          rejectionReason: this.rejectionReasonFor(subOrder),
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

  private serializeSubOrder(subOrder: SubOrder): SerializedSubOrder {
    return Object.assign(subOrder, {
      rejectionReason: this.rejectionReasonFor(subOrder),
    });
  }

  private rejectionReasonFor(subOrder: SubOrder): string | null {
    if (subOrder.status !== SubOrderStatus.REJECTED) {
      return null;
    }

    const reason = subOrder.preparationNote?.trim();
    return reason ? reason : null;
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

    return this.assignSelectedRider(actor, order, rider, note);
  }

  private async assignSelectedRider(
    actor: AuthenticatedUser,
    order: MasterOrder,
    rider: FairAvailableRiderRow,
    note: string,
  ): Promise<{ riderId: string; dispatch: RiderDispatch }> {
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
          preparationNote: outlet.preparationNote,
        })),
      },
    });

    return { riderId: rider.id, dispatch };
  }

  private async findOldestReadyUnassignedOrderForRider(
    riderId: string,
    outletId?: string | null,
  ): Promise<(FairAvailableRiderRow & { orderId: string }) | null> {
    const rows = await this.dataSource.query<Array<FairAvailableRiderRow & { orderId: string }>>(
      `
        WITH rider_assignment_count AS (
          SELECT COUNT(recent_orders.id)::integer AS "assignmentCount"
          FROM master_orders recent_orders
          WHERE recent_orders.rider_id = $1
            AND recent_orders.created_at >= NOW() - INTERVAL '24 hours'
            AND recent_orders.status <> 'CANCELLED'
            AND recent_orders.deleted_at IS NULL
        )
        SELECT
          mo.id AS "orderId",
          $1::uuid AS "id",
          rider_assignment_count."assignmentCount"
        FROM master_orders mo
        CROSS JOIN rider_assignment_count
        WHERE mo.rider_id IS NULL
          AND mo.delivery_mode = 'DELIVERY'
          AND mo.status = ANY($2)
          AND mo.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM master_orders active_orders
            WHERE active_orders.rider_id = $1
              AND active_orders.status <> ALL($3)
              AND active_orders.deleted_at IS NULL
          )
          AND ($4::uuid IS NULL OR EXISTS (
            SELECT 1
            FROM sub_orders scope_sub_orders
            WHERE scope_sub_orders.master_order_id = mo.id
              AND scope_sub_orders.outlet_id = $4
              AND scope_sub_orders.deleted_at IS NULL
          ))
          AND EXISTS (
            SELECT 1
            FROM sub_orders fulfillable_sub_orders
            WHERE fulfillable_sub_orders.master_order_id = mo.id
              AND fulfillable_sub_orders.status <> 'REJECTED'
              AND fulfillable_sub_orders.deleted_at IS NULL
          )
          AND NOT EXISTS (
            SELECT 1
            FROM sub_orders pending_sub_orders
            WHERE pending_sub_orders.master_order_id = mo.id
              AND pending_sub_orders.status <> 'REJECTED'
              AND pending_sub_orders.status <> 'READY'
              AND pending_sub_orders.deleted_at IS NULL
          )
        ORDER BY mo.created_at ASC
        LIMIT 1
      `,
      [
        riderId,
        [MasterOrderStatus.READY, MasterOrderStatus.PARTIALLY_FULFILLED],
        [MasterOrderStatus.DELIVERED, MasterOrderStatus.CANCELLED],
        outletId ?? null,
      ],
    );

    return rows[0] ?? null;
  }

  private async autoAssignRiderIfReady(
    order: MasterOrder,
    actor: AuthenticatedUser,
  ): Promise<{ riderId: string; dispatch: RiderDispatch } | null> {
    if (order.riderId || order.deliveryMode !== "DELIVERY") {
      return null;
    }

    const subOrders = await this.subOrders.find({ where: { masterOrderId: order.id } });
    if (!this.hasAllFulfillableSubOrdersReady(subOrders)) {
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

  private isRiderDispatchVisible(order: MasterOrder, subOrders: SubOrder[]): boolean {
    if (order.status === MasterOrderStatus.OUT_FOR_DELIVERY) {
      return true;
    }

    return this.hasAllFulfillableSubOrdersReady(subOrders);
  }

  private hasAllFulfillableSubOrdersReady(subOrders: SubOrder[]): boolean {
    const fulfillableSubOrders = subOrders.filter(
      (subOrder) => subOrder.status !== SubOrderStatus.REJECTED,
    );

    return (
      fulfillableSubOrders.length > 0 &&
      fulfillableSubOrders.every((subOrder) => subOrder.status === SubOrderStatus.READY)
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

    if (isPlatformAdminRole(user.role) || user.role === UserRole.RIDER) {
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
          AND COALESCE(u.rider_status, 'AVAILABLE') = ANY($2)
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
      [MasterOrderStatus.PREPARING]: SubOrderStatus.PREPARING,
      [MasterOrderStatus.PARTIALLY_READY]: SubOrderStatus.READY,
      [MasterOrderStatus.PARTIALLY_FULFILLED]: SubOrderStatus.REJECTED,
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

    const fulfillableSubOrders = subOrders.filter(
      (subOrder) => subOrder.status !== SubOrderStatus.REJECTED,
    );

    if (fulfillableSubOrders.every((subOrder) => subOrder.status === SubOrderStatus.COLLECTED)) {
      return MasterOrderStatus.DELIVERED;
    }

    if (
      fulfillableSubOrders.every(
        (subOrder) =>
          subOrder.status === SubOrderStatus.DISPATCHED ||
          subOrder.status === SubOrderStatus.COLLECTED,
      )
    ) {
      return MasterOrderStatus.OUT_FOR_DELIVERY;
    }

    if (subOrders.some((subOrder) => subOrder.status === SubOrderStatus.REJECTED)) {
      return MasterOrderStatus.PARTIALLY_FULFILLED;
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

    if (subOrders.some((subOrder) => subOrder.status === SubOrderStatus.PREPARING)) {
      return MasterOrderStatus.PREPARING;
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

    if (order.status === MasterOrderStatus.OUT_FOR_DELIVERY && order.riderId) {
      await this.notifications.createAndPush({
        recipientId: order.riderId,
        recipientRole: UserRole.RIDER,
        type: "ORDER_STATUS",
        title: "Order is out for delivery",
        body: "You are now out for delivery. Keep location sharing active until completion.",
        data: {
          deepLink: `rsc://rider/dispatch/${order.id}`,
          masterOrderId: order.id,
          riderLocationTracking: "START",
        },
      });
    }
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

function paginationMeta(total: number, limit: number, offset: number) {
  const next = offset + limit < total ? offset + limit : null;
  const previous = offset > 0 ? Math.max(0, offset - limit) : null;

  return {
    next,
    previous,
    hasNext: next !== null,
    hasPrevious: previous !== null,
  };
}
