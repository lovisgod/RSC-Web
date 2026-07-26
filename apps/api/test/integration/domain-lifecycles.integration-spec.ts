import type { INestApplication } from "@nestjs/common";
import { ConflictException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { UserRole } from "../../src/auth/user-role.enum";
import { FinanceService } from "../../src/finance/finance.service";
import { MasterOrderStatus, SubOrderStatus } from "../../src/orders/order-status.enum";
import { MasterOrder } from "../../src/orders/master-order.entity";
import { OrdersService } from "../../src/orders/orders.service";
import { SubOrder } from "../../src/orders/sub-order.entity";
import { PaymentRefund } from "../../src/payments/payment-refund.entity";
import { Payment, PaymentStatus } from "../../src/payments/payment.entity";
import { PaymentsService } from "../../src/payments/payments.service";
import {
  actor,
  createOrder,
  createOutlet,
  createPayment,
  createSubOrder,
  createUser,
} from "./fixtures";
import { createIntegrationApp, truncateApplicationTables } from "./test-app";

describe("critical domain lifecycles", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let payments: PaymentsService;
  let orders: OrdersService;
  let finance: FinanceService;

  beforeAll(async () => {
    app = await createIntegrationApp();
    dataSource = app.get(DataSource);
    payments = app.get(PaymentsService);
    orders = app.get(OrdersService);
    finance = app.get(FinanceService);
  });

  beforeEach(async () => {
    await truncateApplicationTables(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it("confirms a payment idempotently and permits only one concurrent pending refund", async () => {
    const customer = await createUser(app, { role: UserRole.CUSTOMER });
    await createUser(app, { role: UserRole.SUPER_ADMIN });
    const outlet = await createOutlet(app);
    const order = await createOrder(app, {
      customerId: customer.id,
      subtotalMinor: 10_000,
      vatMinor: 750,
      totalMinor: 10_750,
    });
    const rejectedSubOrder = await createSubOrder(app, {
      masterOrderId: order.id,
      outletId: outlet.id,
      status: SubOrderStatus.REJECTED,
      subtotalMinor: 5_000,
      commissionMinor: 500,
    });
    await createSubOrder(app, {
      masterOrderId: order.id,
      outletId: outlet.id,
      status: SubOrderStatus.ACCEPTED,
      subtotalMinor: 5_000,
      commissionMinor: 500,
    });
    const payment = await createPayment(app, {
      masterOrderId: order.id,
      reference: "RSC-INTEGRATION-PAYMENT",
    });
    const event = {
      eventId: "integration-event-1",
      eventType: "payment.completed",
      reference: payment.reference,
      amountMinor: payment.amountMinor,
      status: "SUCCESS" as const,
      providerResponse: { source: "integration-test" },
    };

    await expect(payments.confirmPayment(event)).resolves.toEqual({ already: false });
    await expect(payments.confirmPayment(event)).resolves.toEqual({ already: true });

    const persistedPayment = await dataSource.getRepository(Payment).findOneByOrFail({
      id: payment.id,
    });
    const persistedOrder = await dataSource.getRepository(MasterOrder).findOneByOrFail({
      id: order.id,
    });
    expect(persistedPayment.status).toBe(PaymentStatus.SUCCESS);
    expect(persistedOrder.status).toBe(MasterOrderStatus.CONFIRMED);

    const attempts = await Promise.allSettled([
      payments.requestRefund(actor(customer.id, UserRole.CUSTOMER), payment.reference, {
        subOrderId: rejectedSubOrder.id,
        reason: "Rejected outlet item",
      }),
      payments.requestRefund(actor(customer.id, UserRole.CUSTOMER), payment.reference, {
        subOrderId: rejectedSubOrder.id,
        reason: "Duplicate request",
      }),
    ]);
    expect(attempts.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const rejectedAttempt = attempts.find(({ status }) => status === "rejected");
    expect(rejectedAttempt?.status).toBe("rejected");
    const rejectedReason = (rejectedAttempt as { reason: unknown } | undefined)?.reason;
    expect(rejectedReason).toBeInstanceOf(ConflictException);

    const refunds = await dataSource.getRepository(PaymentRefund).findBy({
      paymentId: payment.id,
    });
    expect(refunds).toHaveLength(1);
    expect(refunds[0]).toMatchObject({
      status: "PENDING",
      amountMinor: 5_875,
      requestedBy: customer.id,
    });
  });

  it("completes the deliverable part of a mixed multi-outlet order", async () => {
    const customer = await createUser(app, { role: UserRole.CUSTOMER });
    const rider = await createUser(app, { role: UserRole.RIDER });
    const firstOutlet = await createOutlet(app, { name: "Delivered outlet" });
    const secondOutlet = await createOutlet(app, { name: "Rejected outlet" });
    const order = await createOrder(app, {
      customerId: customer.id,
      riderId: rider.id,
      status: MasterOrderStatus.OUT_FOR_DELIVERY,
      deliveryCode: "654321",
    });
    const dispatched = await createSubOrder(app, {
      masterOrderId: order.id,
      outletId: firstOutlet.id,
      status: SubOrderStatus.DISPATCHED,
    });
    const rejected = await createSubOrder(app, {
      masterOrderId: order.id,
      outletId: secondOutlet.id,
      status: SubOrderStatus.REJECTED,
    });

    const detail = await orders.completeDelivery(actor(rider.id, UserRole.RIDER), order.id, {
      code: "654321",
    });

    expect(detail.order.status).toBe(MasterOrderStatus.DELIVERED);
    expect(
      await dataSource.getRepository(SubOrder).findOneByOrFail({ id: dispatched.id }),
    ).toMatchObject({ status: SubOrderStatus.COLLECTED });
    expect(
      await dataSource.getRepository(SubOrder).findOneByOrFail({ id: rejected.id }),
    ).toMatchObject({ status: SubOrderStatus.REJECTED });

    const customerHistory = await orders.listMine(actor(customer.id, UserRole.CUSTOMER));
    expect(customerHistory.orders.map((item) => item.status)).toEqual(
      expect.arrayContaining([MasterOrderStatus.DELIVERED, MasterOrderStatus.CANCELLED]),
    );
  });

  it("approves a closed settlement window once and reports it as approved", async () => {
    const customer = await createUser(app, { role: UserRole.CUSTOMER });
    const superAdmin = await createUser(app, { role: UserRole.SUPER_ADMIN });
    const outlet = await createOutlet(app, {
      name: "Settlement outlet",
      settlementSubaccountCode: "TEST_SETTLEMENT_ACCOUNT",
    });
    const settledAt = new Date();
    settledAt.setUTCDate(settledAt.getUTCDate() - 2);
    const settlementDate = settledAt.toISOString().slice(0, 10);
    const order = await createOrder(app, {
      customerId: customer.id,
      status: MasterOrderStatus.DELIVERED,
      createdAt: settledAt,
    });
    await createSubOrder(app, {
      masterOrderId: order.id,
      outletId: outlet.id,
      status: SubOrderStatus.COLLECTED,
      subtotalMinor: 8_000,
      commissionMinor: 800,
      updatedAt: settledAt,
    });
    await createPayment(app, {
      masterOrderId: order.id,
      status: PaymentStatus.SUCCESS,
      amountMinor: 8_600,
    });
    const query = { dateFrom: settlementDate, dateTo: settlementDate };

    const beforeApproval = await finance.outletSettlements({ ...query, outletId: outlet.id });
    expect(beforeApproval[0]).toMatchObject({
      status: "PENDING",
      completedSubOrders: 1,
      pendingSubOrders: 1,
      approvalAvailable: true,
    });

    await finance.approveOutletSettlement(
      outlet.id,
      actor(superAdmin.id, UserRole.SUPER_ADMIN),
      query,
    );
    await finance.approveOutletSettlement(
      outlet.id,
      actor(superAdmin.id, UserRole.SUPER_ADMIN),
      query,
    );

    const afterApproval = await finance.outletSettlements({ ...query, outletId: outlet.id });
    expect(afterApproval[0]).toMatchObject({
      status: "APPROVED",
      completedSubOrders: 1,
      pendingSubOrders: 0,
      approvalAvailable: false,
    });
    const approvals = await dataSource.query<Array<{ count: string }>>(
      "SELECT COUNT(*)::text AS count FROM outlet_settlement_approvals",
    );
    expect(approvals[0]?.count).toBe("1");
  });
});
