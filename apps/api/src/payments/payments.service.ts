import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import type Redis from "ioredis";
import { DataSource, In, QueryFailedError, Repository } from "typeorm";

import { Customer } from "../auth/customer.entity";
import type { AuthenticatedUser } from "../auth/authenticated-user";
import { normalizeNigerianPhoneNumber } from "../auth/phone-number";
import { PiiCryptoService } from "../common/security/pii-crypto.service";
import { REDIS_CLIENT } from "../redis/redis.constants";
import type { ApplicationConfig } from "../config/configuration";
import { DeliveryService } from "../delivery/delivery.service";
import { ItemModifier } from "../catalog/item-modifier.entity";
import { MenuItem } from "../catalog/menu-item.entity";
import { Outlet } from "../outlets/outlet.entity";
import { RealtimeService } from "../realtime/realtime.service";
import { Promo } from "../notifications/promo.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { MasterOrder } from "../orders/master-order.entity";
import { OrderLineItem } from "../orders/order-line-item.entity";
import { MasterOrderStatus, SubOrderStatus } from "../orders/order-status.enum";
import { SubOrder } from "../orders/sub-order.entity";
import { UserRole } from "../auth/user-role.enum";
import type {
  InitiatePaymentDto,
  ListRefundRequestsQueryDto,
  RetryPaymentDto,
} from "./dto/payment.dto";
import type { UpdatePlatformChargesDto } from "./dto/platform-charges.dto";
import { Payment, PaymentStatus } from "./payment.entity";
import { PaymentRefund } from "./payment-refund.entity";
import {
  PAYMENT_ADAPTER,
  type InitiateProviderPaymentInput,
  type ParsedWebhookEvent,
  type PaymentAdapter,
  type PaymentSplitRoute,
} from "./payment-adapter";

interface PricedLine {
  outletId: string;
  menuItemId: string;
  itemNameSnapshot: string;
  baseUnitPriceMinor: number;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
  modifiersSnapshot: Array<{ id: string; name: string; priceDeltaMinor: number }>;
  customerNote?: string | null;
}

export interface PlatformCharges {
  platformCommissionBps: number;
  defaultVatBps: number;
  deliveryFeeMinor: number;
  serviceFeeMinor: number;
  currency: "NGN";
}

interface PlatformChargesRow {
  platformCommissionBps: number;
  defaultVatBps: number;
  deliveryFeeMinor: number;
  serviceFeeMinor: number;
  currency: "NGN";
}

export interface InitiatePaymentResponse {
  masterOrderId: string;
  paymentId: string;
  reference: string;
  checkoutUrl: string | null;
  status: PaymentStatus;
  totals: {
    subtotalMinor: number;
    deliveryFeeMinor: number;
    serviceFeeMinor: number;
    vatMinor: number;
    discountMinor: number;
    platformCommissionMinor: number;
    totalMinor: number;
    currency: "NGN";
  };
  splitBreakdown: PaymentSplitRoute[];
}

interface RefundRequestRaw {
  payment_id: string | null;
  payment_master_order_id: string | null;
  payment_amount_minor: number | null;
  payment_currency: "NGN" | null;
  payment_gateway: string | null;
  payment_reference: string | null;
  payment_status: PaymentStatus | null;
  payment_created_at: Date | null;
  order_id: string | null;
  order_customer_id: string | null;
  order_status: MasterOrderStatus | null;
  order_total_minor: number | null;
  order_currency: "NGN" | null;
  order_created_at: Date | null;
  customer_id: string | null;
  customer_name: string | null;
  requester_id: string | null;
  requester_name: string | null;
  requester_role: UserRole | null;
}

export interface RefundRequestListResult {
  refundRequests: Array<{
    refund: PaymentRefund;
    payment: {
      id: string;
      masterOrderId: string;
      amountMinor: number;
      currency: "NGN";
      gateway: string;
      reference: string;
      status: PaymentStatus;
      createdAt: Date;
    } | null;
    order: {
      id: string;
      customerId: string;
      status: MasterOrderStatus;
      totalMinor: number;
      currency: "NGN";
      createdAt: Date;
    } | null;
    customer: { id: string; name: string } | null;
    requestedBy: { id: string; name: string; role: UserRole } | null;
  }>;
  total: number;
  limit: number;
  offset: number;
  next: number | null;
  previous: number | null;
  hasNext: boolean;
  hasPrevious: boolean;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly platformCommissionBps: number;
  private readonly vatBps: number;
  private readonly deliveryFeeMinor: number;

  constructor(
    @InjectRepository(Customer) private readonly users: Repository<Customer>,
    @InjectRepository(MenuItem) private readonly menuItems: Repository<MenuItem>,
    @InjectRepository(ItemModifier) private readonly modifiers: Repository<ItemModifier>,
    @InjectRepository(Outlet) private readonly outlets: Repository<Outlet>,
    @InjectRepository(MasterOrder) private readonly masterOrders: Repository<MasterOrder>,
    @InjectRepository(SubOrder) private readonly subOrders: Repository<SubOrder>,
    @InjectRepository(OrderLineItem) private readonly lineItems: Repository<OrderLineItem>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(PaymentRefund) private readonly refunds: Repository<PaymentRefund>,
    @InjectRepository(Promo) private readonly promos: Repository<Promo>,
    private readonly dataSource: DataSource,
    private readonly delivery: DeliveryService,
    private readonly piiCrypto: PiiCryptoService,
    private readonly configService: ConfigService<ApplicationConfig, true>,
    @Inject(PAYMENT_ADAPTER) private readonly paymentAdapter: PaymentAdapter,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis,
  ) {
    const paymentsConfig = configService.get("payments", { infer: true });

    this.platformCommissionBps = paymentsConfig.platformCommissionBps;
    this.vatBps = paymentsConfig.vatBps;
    this.deliveryFeeMinor = paymentsConfig.deliveryFeeMinor;
  }

  async getPlatformCharges(): Promise<PlatformCharges> {
    const [row] = await this.dataSource.query<PlatformChargesRow[]>(
      `
        SELECT
          platform_commission_bps AS "platformCommissionBps",
          default_vat_bps AS "defaultVatBps",
          delivery_fee_minor AS "deliveryFeeMinor",
          service_fee_minor AS "serviceFeeMinor",
          currency
        FROM platform_charges
        WHERE id = 1
        LIMIT 1
      `,
    );

    return row ?? this.defaultPlatformCharges();
  }

  async updatePlatformCharges(input: UpdatePlatformChargesDto): Promise<PlatformCharges> {
    const current = await this.getPlatformCharges();
    const next = {
      platformCommissionBps: input.platformCommissionBps ?? current.platformCommissionBps,
      defaultVatBps: input.defaultVatBps ?? current.defaultVatBps,
      deliveryFeeMinor: input.deliveryFeeMinor ?? current.deliveryFeeMinor,
      serviceFeeMinor: input.serviceFeeMinor ?? current.serviceFeeMinor,
      currency: "NGN" as const,
    };
    const [row] = await this.dataSource.query<PlatformChargesRow[]>(
      `
        INSERT INTO platform_charges (
          id,
          platform_commission_bps,
          default_vat_bps,
          delivery_fee_minor,
          service_fee_minor,
          currency,
          updated_at
        )
        VALUES (1, $1, $2, $3, $4, 'NGN', now())
        ON CONFLICT (id) DO UPDATE SET
          platform_commission_bps = EXCLUDED.platform_commission_bps,
          default_vat_bps = EXCLUDED.default_vat_bps,
          delivery_fee_minor = EXCLUDED.delivery_fee_minor,
          service_fee_minor = EXCLUDED.service_fee_minor,
          updated_at = now()
        RETURNING
          platform_commission_bps AS "platformCommissionBps",
          default_vat_bps AS "defaultVatBps",
          delivery_fee_minor AS "deliveryFeeMinor",
          service_fee_minor AS "serviceFeeMinor",
          currency
      `,
      [next.platformCommissionBps, next.defaultVatBps, next.deliveryFeeMinor, next.serviceFeeMinor],
    );

    return row ?? next;
  }

  private defaultPlatformCharges(): PlatformCharges {
    return {
      platformCommissionBps: this.platformCommissionBps,
      defaultVatBps: this.vatBps,
      deliveryFeeMinor: this.deliveryFeeMinor,
      serviceFeeMinor: 0,
      currency: "NGN" as const,
    };
  }

  async initiate(
    user: AuthenticatedUser,
    input: InitiatePaymentDto,
  ): Promise<InitiatePaymentResponse> {
    const idempotencyKey = input.idempotencyKey?.trim();
    const cacheKey = idempotencyKey ? `idempotency:checkout:${user.id}:${idempotencyKey}` : null;
    const lockKey = idempotencyKey ? `idempotency:lock:${user.id}:${idempotencyKey}` : null;

    if (cacheKey && this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as InitiatePaymentResponse;
        }
      } catch (err) {
        this.logger.warn(
          `Failed to read checkout idempotency cache for ${cacheKey}: ${(err as Error).message}`,
        );
      }
    }

    let lockAcquired = false;
    if (lockKey && this.redis) {
      try {
        const result = await this.redis.set(lockKey, "1", "EX", 30, "NX");
        lockAcquired = result === "OK";
        if (!lockAcquired) {
          for (let i = 0; i < 5; i++) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            if (cacheKey) {
              const cached = await this.redis.get(cacheKey);
              if (cached) {
                return JSON.parse(cached) as InitiatePaymentResponse;
              }
            }
          }
          throw new ConflictException("Checkout initiation is already in progress");
        }
      } catch (err) {
        if (err instanceof ConflictException) throw err;
        this.logger.warn(
          `Failed to acquire checkout idempotency lock for ${lockKey}: ${(err as Error).message}`,
        );
      }
    }

    try {
      if (input.deliveryMode === "DELIVERY") {
        if (
          !input.deliveryAddress ||
          input.deliveryLatitude === undefined ||
          input.deliveryLongitude === undefined
        ) {
          throw new BadRequestException("Delivery address and coordinates are required");
        }

        const validation = await this.delivery.validateAddress({
          latitude: input.deliveryLatitude,
          longitude: input.deliveryLongitude,
        });

        if (!validation.deliverable) {
          throw new BadRequestException("Delivery address is outside the service zone");
        }
      }

      const customer = await this.users.findOneBy({ id: user.id });

      if (!customer) {
        throw new BadRequestException("Customer not found");
      }

      const pricedLines = await this.priceCart(input);
      const platformCharges = await this.getPlatformCharges();
      const grouped = new Map<string, PricedLine[]>();

      for (const line of pricedLines) {
        grouped.set(line.outletId, [...(grouped.get(line.outletId) ?? []), line]);
      }

      const outletIds = [...grouped.keys()];
      const outlets = await this.outlets.findBy({ id: In(outletIds) });
      const outletById = new Map(outlets.map((outlet) => [outlet.id, outlet]));

      this.ensureOutletsAreOnline(outletIds, outletById);

      const subtotalMinor = pricedLines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
      const deliveryFeeMinor =
        input.deliveryMode === "DELIVERY" ? platformCharges.deliveryFeeMinor : 0;
      const serviceFeeMinor = platformCharges.serviceFeeMinor;
      const vatMinor = outletIds.reduce((sum, outletId) => {
        const outletSubtotalMinor = grouped
          .get(outletId)!
          .reduce((lineSum, line) => lineSum + line.lineTotalMinor, 0);
        const outletVatBps = outletById.get(outletId)?.vatBps ?? 0;
        const vatBps = outletVatBps > 0 ? outletVatBps : platformCharges.defaultVatBps;

        return sum + Math.round((outletSubtotalMinor * vatBps) / 10_000);
      }, 0);

      const splitRoutes: PaymentSplitRoute[] = outletIds.map((outletId) => {
        const grossMinor = grouped
          .get(outletId)!
          .reduce((sum, line) => sum + line.lineTotalMinor, 0);
        const commissionMinor = Math.round(
          (grossMinor * platformCharges.platformCommissionBps) / 10_000,
        );

        return {
          outletId,
          subaccountCode: outletById.get(outletId)?.settlementSubaccountCode ?? null,
          grossMinor,
          commissionMinor,
          netMinor: grossMinor - commissionMinor,
        };
      });

      const platformCommissionMinor = splitRoutes.reduce((sum, r) => sum + r.commissionMinor, 0);
      const discountMinor = await this.calculatePromoDiscount(input, {
        subtotalMinor,
        deliveryFeeMinor,
        outletIds,
        grouped,
      });
      const totalMinor =
        subtotalMinor +
        deliveryFeeMinor +
        serviceFeeMinor +
        vatMinor +
        platformCommissionMinor -
        discountMinor;
      const undiscountedTotalMinor = totalMinor + discountMinor;

      // Validate client-provided totals to prevent cheating/manipulation
      if (input.subtotalMinor !== subtotalMinor) {
        throw new BadRequestException(
          `Subtotal mismatch: expected ${subtotalMinor}, got ${input.subtotalMinor}`,
        );
      }
      if (input.deliveryFeeMinor !== deliveryFeeMinor) {
        throw new BadRequestException(
          `Delivery fee mismatch: expected ${deliveryFeeMinor}, got ${input.deliveryFeeMinor}`,
        );
      }
      if (input.serviceFeeMinor !== serviceFeeMinor) {
        throw new BadRequestException(
          `Service fee mismatch: expected ${serviceFeeMinor}, got ${input.serviceFeeMinor}`,
        );
      }
      if (input.vatMinor !== vatMinor) {
        throw new BadRequestException(`VAT mismatch: expected ${vatMinor}, got ${input.vatMinor}`);
      }
      if (input.discountMinor !== undefined && input.discountMinor !== discountMinor) {
        throw new BadRequestException(
          `Discount mismatch: expected ${discountMinor}, got ${input.discountMinor}`,
        );
      }
      if (input.platformCommissionMinor !== platformCommissionMinor) {
        throw new BadRequestException(
          `Platform commission mismatch: expected ${platformCommissionMinor}, got ${input.platformCommissionMinor}`,
        );
      }
      if (input.totalMinor !== totalMinor && input.totalMinor !== undiscountedTotalMinor) {
        throw new BadRequestException(
          `Total mismatch: expected ${totalMinor}, got ${input.totalMinor}`,
        );
      }
      const reference = `RSC-${randomUUID()}`;
      const customerEmail = this.piiCrypto.decrypt(customer.emailEncrypted);
      const recipientPhone = this.normalizeRecipientPhone(input.recipientPhone);
      const preparationNote = input.preparationNote?.trim() || null;
      const returnUrl = this.normalizeReturnUrl(input.returnUrl);

      const providerPaymentInput: InitiateProviderPaymentInput = {
        email: customerEmail,
        amountMinor: totalMinor,
        currency: "NGN",
        reference,
        splitRoutes,
        ...(returnUrl ? { returnUrl } : {}),
      };
      const providerPayment = await this.paymentAdapter.initiate(providerPaymentInput);

      const persisted = await this.dataSource.transaction(async (manager) => {
        const masterOrder = await manager.save(
          manager.create(MasterOrder, {
            customerId: user.id,
            subtotalMinor,
            deliveryFeeMinor,
            serviceFeeMinor,
            vatMinor,
            discountMinor,
            totalMinor,
            currency: "NGN",
            deliveryMode: input.deliveryMode,
            deliveryAddress: input.deliveryAddress ?? null,
            deliveryLatitude: input.deliveryLatitude ?? null,
            deliveryLongitude: input.deliveryLongitude ?? null,
            recipientPhone,
            paymentReference: providerPayment.reference,
            deliveryCode: randomSixDigitCode(),
            status:
              providerPayment.status === "SUCCESS"
                ? MasterOrderStatus.CONFIRMED
                : MasterOrderStatus.PENDING_PAYMENT,
          }),
        );

        const subOrders: SubOrder[] = [];
        for (const route of splitRoutes) {
          const subOrder = await manager.save(
            manager.create(SubOrder, {
              masterOrderId: masterOrder.id,
              outletId: route.outletId,
              pickupCode: randomSixDigitCode(),
              subtotalMinor: route.grossMinor,
              commissionMinor: route.commissionMinor,
              netMinor: route.netMinor,
              preparationNote,
            }),
          );
          subOrders.push(subOrder);

          for (const line of grouped.get(route.outletId)!) {
            await manager.save(
              manager.create(OrderLineItem, {
                masterOrderId: masterOrder.id,
                subOrderId: subOrder.id,
                outletId: route.outletId,
                menuItemId: line.menuItemId,
                itemNameSnapshot: line.itemNameSnapshot,
                baseUnitPriceMinor: line.baseUnitPriceMinor,
                unitPriceMinor: line.unitPriceMinor,
                quantity: line.quantity,
                lineTotalMinor: line.lineTotalMinor,
                currency: "NGN",
                modifiersSnapshot: line.modifiersSnapshot,
                customerNote: line.customerNote ?? null,
              }),
            );
          }
        }

        const payment = await manager.save(
          manager.create(Payment, {
            masterOrderId: masterOrder.id,
            amountMinor: totalMinor,
            currency: "NGN",
            gateway: providerPayment.gateway,
            reference: providerPayment.reference,
            status:
              providerPayment.status === "SUCCESS" ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
            checkoutUrl: providerPayment.checkoutUrl,
            splitBreakdown: splitRoutes,
            providerResponse: providerPayment.providerResponse,
          }),
        );

        return { masterOrder, subOrders, payment };
      });

      if (persisted.payment.status === PaymentStatus.SUCCESS) {
        await this.emitConfirmedSubOrders(persisted.masterOrder);
        await this.notifyAdminsOfSuccessfulPayment(persisted.masterOrder, persisted.payment);
      }

      const response = {
        masterOrderId: persisted.masterOrder.id,
        paymentId: persisted.payment.id,
        reference: persisted.payment.reference,
        checkoutUrl: persisted.payment.checkoutUrl,
        status: persisted.payment.status,
        totals: {
          subtotalMinor,
          deliveryFeeMinor,
          serviceFeeMinor,
          vatMinor,
          discountMinor,
          platformCommissionMinor,
          totalMinor,
          currency: "NGN" as const,
        },
        splitBreakdown: splitRoutes,
      };

      if (cacheKey && this.redis) {
        try {
          await this.redis.set(cacheKey, JSON.stringify(response), "EX", 1800);
        } catch (err) {
          this.logger.warn(
            `Failed to save checkout idempotency cache for ${cacheKey}: ${(err as Error).message}`,
          );
        }
      }

      return response;
    } finally {
      if (lockKey && lockAcquired && this.redis) {
        try {
          await this.redis.del(lockKey);
        } catch {
          // ignore
        }
      }
    }
  }

  async retryOrderPayment(user: AuthenticatedUser, orderId: string, input: RetryPaymentDto = {}) {
    const order = await this.masterOrders.findOneBy({ id: orderId });

    if (!order || order.customerId !== user.id) {
      throw new NotFoundException("Order not found");
    }

    const existingPayments = await this.payments.find({
      where: { masterOrderId: order.id },
      order: { createdAt: "DESC" },
    });

    if (existingPayments.some((payment) => payment.status === PaymentStatus.SUCCESS)) {
      throw new BadRequestException("This order has already been paid");
    }

    const customer = await this.users.findOneBy({ id: user.id });
    if (!customer) {
      throw new BadRequestException("Customer not found");
    }

    const subOrders = await this.subOrders.find({ where: { masterOrderId: order.id } });
    if (subOrders.length === 0) {
      throw new BadRequestException("Order has no payable sub-orders");
    }

    const outletIds = subOrders.map((subOrder) => subOrder.outletId);
    const outlets = await this.outlets.findBy({ id: In(outletIds) });
    const outletById = new Map(outlets.map((outlet) => [outlet.id, outlet]));
    const splitRoutes: PaymentSplitRoute[] = subOrders.map((subOrder) => ({
      outletId: subOrder.outletId,
      subaccountCode: outletById.get(subOrder.outletId)?.settlementSubaccountCode ?? null,
      grossMinor: subOrder.subtotalMinor,
      commissionMinor: subOrder.commissionMinor,
      netMinor: subOrder.netMinor,
    }));
    const platformCommissionMinor = splitRoutes.reduce(
      (sum, route) => sum + route.commissionMinor,
      0,
    );
    const reference = `RSC-${randomUUID()}`;
    const returnUrl = this.normalizeReturnUrl(input.returnUrl);
    const providerPayment = await this.paymentAdapter.initiate({
      email: this.piiCrypto.decrypt(customer.emailEncrypted),
      amountMinor: order.totalMinor,
      currency: order.currency,
      reference,
      splitRoutes,
      ...(returnUrl ? { returnUrl } : {}),
    });

    await this.payments.update(
      { masterOrderId: order.id, status: PaymentStatus.PENDING },
      { status: PaymentStatus.FAILED },
    );

    const payment = await this.payments.save(
      this.payments.create({
        masterOrderId: order.id,
        amountMinor: order.totalMinor,
        currency: order.currency,
        gateway: providerPayment.gateway,
        reference: providerPayment.reference,
        status:
          providerPayment.status === "SUCCESS" ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
        checkoutUrl: providerPayment.checkoutUrl,
        splitBreakdown: splitRoutes,
        providerResponse: providerPayment.providerResponse,
      }),
    );

    order.paymentReference = payment.reference;
    order.status =
      payment.status === PaymentStatus.SUCCESS
        ? MasterOrderStatus.CONFIRMED
        : MasterOrderStatus.PENDING_PAYMENT;
    await this.masterOrders.save(order);
    this.realtime.emitOrderStatusUpdate({
      masterOrderId: order.id,
      customerId: order.customerId,
      riderId: order.riderId,
      status: order.status,
      updatedAt: order.updatedAt,
    });
    if (payment.status === PaymentStatus.SUCCESS) {
      await this.emitConfirmedSubOrders(order);
      await this.notifyAdminsOfSuccessfulPayment(order, payment);
    }

    return {
      masterOrderId: order.id,
      paymentId: payment.id,
      reference: payment.reference,
      checkoutUrl: payment.checkoutUrl,
      status: payment.status,
      totals: {
        subtotalMinor: order.subtotalMinor,
        deliveryFeeMinor: order.deliveryFeeMinor,
        serviceFeeMinor: order.serviceFeeMinor,
        vatMinor: order.vatMinor,
        discountMinor: order.discountMinor,
        platformCommissionMinor,
        totalMinor: order.totalMinor,
        currency: order.currency,
      },
      splitBreakdown: splitRoutes,
    };
  }

  // ---------------------------------------------------------------------------
  // Webhook confirmation (server-authoritative, idempotent)
  // ---------------------------------------------------------------------------

  async confirmPayment(event: ParsedWebhookEvent): Promise<{ already: boolean }> {
    this.logger.log(
      `Confirming payment from webhook: reference=${event.reference}, eventId=${event.eventId}, status=${event.status}, amountMinor=${event.amountMinor}`,
    );

    const paymentsConfig = this.configService.get("payments", { infer: true });
    const gateway = paymentsConfig.provider;
    let payment: Payment | null = null;
    let order: MasterOrder | null = null;
    let already = false;

    await this.dataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(Payment);
      const orderRepository = manager.getRepository(MasterOrder);
      payment = await paymentRepository.findOne({
        where: { reference: event.reference },
        lock: { mode: "pessimistic_write" },
      });

      if (!payment) {
        this.logger.warn(`Webhook: no payment found for reference ${event.reference}`);
        throw new ServiceUnavailableException("Payment is not ready for webhook confirmation");
      }

      if (
        event.status === "SUCCESS" &&
        event.amountMinor > 0 &&
        event.amountMinor !== payment.amountMinor
      ) {
        this.logger.error(
          `Webhook amount mismatch for ${event.reference}: expected ${payment.amountMinor}, received ${event.amountMinor}`,
        );
        throw new BadRequestException("Webhook payment amount does not match the order total");
      }

      const insertedEvents = await manager.query<Array<{ id: string }>>(
        `INSERT INTO payment_webhook_events (gateway, event_id, event_type, payload)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (gateway, event_id) DO NOTHING
         RETURNING id`,
        [gateway, event.eventId, event.eventType, JSON.stringify(event.providerResponse)],
      );
      if (insertedEvents.length === 0) {
        already = true;
        return;
      }

      if (payment.status !== PaymentStatus.PENDING) {
        already = true;
        return;
      }

      if (event.status === "PENDING") {
        payment.providerResponse = event.providerResponse;
        await paymentRepository.save(payment);
        return;
      }

      payment.status = event.status === "SUCCESS" ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
      await paymentRepository.save(payment);

      order = await orderRepository.findOne({
        where: { id: payment.masterOrderId },
        lock: { mode: "pessimistic_write" },
      });

      if (order?.status === MasterOrderStatus.PENDING_PAYMENT) {
        order.status =
          event.status === "SUCCESS" ? MasterOrderStatus.CONFIRMED : MasterOrderStatus.CANCELLED;
        await orderRepository.save(order);
      }
    });

    const confirmedPayment = payment as Payment | null;
    const confirmedOrder = order as MasterOrder | null;

    if (already || !confirmedPayment) {
      if (already) {
        this.logger.log(`Webhook event ${event.eventId} already processed — skipping`);
      }
      return { already };
    }

    if (confirmedOrder?.status === MasterOrderStatus.CONFIRMED) {
      this.realtime.emitOrderStatusUpdate({
        masterOrderId: confirmedOrder.id,
        customerId: confirmedOrder.customerId,
        riderId: confirmedOrder.riderId,
        status: confirmedOrder.status,
        updatedAt: confirmedOrder.updatedAt,
      });

      await this.emitConfirmedSubOrders(confirmedOrder);
      await this.notifyAdminsOfSuccessfulPayment(confirmedOrder, confirmedPayment);
    }

    this.logger.log(
      `Payment webhook applied for ${confirmedPayment.reference}: ${confirmedPayment.status} (order ${confirmedPayment.masterOrderId})`,
    );

    return { already };
  }

  private async emitConfirmedSubOrders(order: MasterOrder) {
    const [subOrders, lineItems] = await Promise.all([
      this.subOrders.find({ where: { masterOrderId: order.id }, order: { createdAt: "ASC" } }),
      this.lineItems.find({ where: { masterOrderId: order.id }, order: { createdAt: "ASC" } }),
    ]);

    for (const subOrder of subOrders) {
      this.realtime.emitSuborderConfirmed({
        masterOrderId: order.id,
        subOrderId: subOrder.id,
        outletId: subOrder.outletId,
        status: order.status,
        order,
        subOrder,
        lineItems: lineItems.filter((lineItem) => lineItem.subOrderId === subOrder.id),
      });
    }
  }

  private async notifyAdminsOfSuccessfulPayment(order: MasterOrder, payment: Payment) {
    const subOrders = await this.subOrders.find({ where: { masterOrderId: order.id } });
    const outletIds = [...new Set(subOrders.map((subOrder) => subOrder.outletId))];
    const recipients = await this.users.find({
      where: [
        { role: UserRole.OWNER },
        { role: UserRole.SUPER_ADMIN },
        ...(outletIds.length > 0 ? [{ role: UserRole.ADMIN, outletId: In(outletIds) }] : []),
      ],
      select: { id: true, role: true, outletId: true },
    });
    const title = "Payment successful";
    const body = `Payment received for order ${order.id}.`;
    const data = {
      masterOrderId: order.id,
      paymentId: payment.id,
      reference: payment.reference,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      outletIds,
      deepLink: `/orders/${order.id}`,
    };

    await Promise.all(
      recipients.map((recipient) =>
        this.notifications.createAndPush({
          recipientId: recipient.id,
          recipientRole: recipient.role,
          type: "PAYMENT_SUCCESS",
          title,
          body,
          data,
        }),
      ),
    );

    this.realtime.emitAdminNotification(
      {
        type: "PAYMENT_SUCCESS",
        title,
        body,
        data,
      },
      outletIds,
    );
  }

  // ---------------------------------------------------------------------------
  // Verify — frontend polling fallback when webhook delivery is delayed
  // ---------------------------------------------------------------------------

  async verifyPayment(user: AuthenticatedUser, reference: string) {
    const payment = await this.payments.findOneBy({ reference });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    const order = await this.masterOrders.findOneBy({ id: payment.masterOrderId });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Customers can only query their own payments
    if (order.customerId !== user.id) {
      throw new NotFoundException("Payment not found");
    }

    // If already settled, return immediately without hitting the provider
    if (payment.status !== PaymentStatus.PENDING) {
      return { status: payment.status, orderStatus: order.status };
    }

    // Poll the provider
    const result = await this.paymentAdapter.verify(reference);

    if (result.status !== "PENDING") {
      const event: ParsedWebhookEvent = {
        eventId: `verify-${reference}`,
        eventType: result.status === "SUCCESS" ? "charge.success" : "charge.failed",
        reference,
        status: result.status,
        amountMinor: result.amountMinor,
        providerResponse: result.providerResponse,
      };
      await this.confirmPayment(event);

      // Reload after update
      const updatedPayment = await this.payments.findOneBy({ reference });
      const updatedOrder = await this.masterOrders.findOneBy({ id: payment.masterOrderId });

      return {
        status: updatedPayment?.status ?? payment.status,
        orderStatus: updatedOrder?.status ?? order.status,
      };
    }

    return { status: payment.status, orderStatus: order.status };
  }

  async listRefundRequests(
    query: ListRefundRequestsQueryDto = {},
  ): Promise<RefundRequestListResult> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const refundQuery = this.refunds
      .createQueryBuilder("refund")
      .leftJoin(Payment, "payment", "payment.id = refund.payment_id")
      .leftJoin(MasterOrder, "masterOrder", "masterOrder.id = payment.master_order_id")
      .leftJoin(Customer, "customer", "customer.id = masterOrder.customer_id")
      .leftJoin(Customer, "requester", "requester.id = refund.requested_by")
      .addSelect("payment.id", "payment_id")
      .addSelect("payment.masterOrderId", "payment_master_order_id")
      .addSelect("payment.amountMinor", "payment_amount_minor")
      .addSelect("payment.currency", "payment_currency")
      .addSelect("payment.gateway", "payment_gateway")
      .addSelect("payment.reference", "payment_reference")
      .addSelect("payment.status", "payment_status")
      .addSelect("payment.createdAt", "payment_created_at")
      .addSelect("masterOrder.id", "order_id")
      .addSelect("masterOrder.customerId", "order_customer_id")
      .addSelect("masterOrder.status", "order_status")
      .addSelect("masterOrder.totalMinor", "order_total_minor")
      .addSelect("masterOrder.currency", "order_currency")
      .addSelect("masterOrder.createdAt", "order_created_at")
      .addSelect("customer.id", "customer_id")
      .addSelect("customer.name", "customer_name")
      .addSelect("requester.id", "requester_id")
      .addSelect("requester.name", "requester_name")
      .addSelect("requester.role", "requester_role")
      .orderBy("refund.createdAt", "DESC");

    if (query.status) {
      refundQuery.andWhere("refund.status = :status", { status: query.status });
    }

    const reference = query.reference?.trim();
    if (reference) {
      refundQuery.andWhere(
        "(refund.reference ILIKE :reference OR payment.reference ILIKE :reference)",
        {
          reference: `%${reference}%`,
        },
      );
    }

    if (query.customerId) {
      refundQuery.andWhere("masterOrder.customerId = :customerId", {
        customerId: query.customerId,
      });
    }

    if (query.requestedBy) {
      refundQuery.andWhere("refund.requestedBy = :requestedBy", { requestedBy: query.requestedBy });
    }

    if (query.dateFrom) {
      refundQuery.andWhere("refund.createdAt >= :dateFrom", { dateFrom: new Date(query.dateFrom) });
    }

    if (query.dateTo) {
      refundQuery.andWhere("refund.createdAt <= :dateTo", { dateTo: new Date(query.dateTo) });
    }

    const total = await refundQuery.getCount();
    const { entities, raw }: { entities: PaymentRefund[]; raw: RefundRequestRaw[] } =
      await refundQuery.take(limit).skip(offset).getRawAndEntities<RefundRequestRaw>();

    return {
      refundRequests: entities.map((refund, index) =>
        this.serializeRefundRequest(refund, raw[index] ?? null),
      ),
      total,
      limit,
      offset,
      ...paginationMeta(total, limit, offset),
    };
  }

  private serializeRefundRequest(refund: PaymentRefund, row: RefundRequestRaw | null) {
    return {
      refund,
      payment:
        row?.payment_id && row.payment_master_order_id && row.payment_reference
          ? {
              id: row.payment_id,
              masterOrderId: row.payment_master_order_id,
              amountMinor: row.payment_amount_minor ?? 0,
              currency: row.payment_currency ?? "NGN",
              gateway: row.payment_gateway ?? refund.provider,
              reference: row.payment_reference,
              status: row.payment_status ?? PaymentStatus.PENDING,
              createdAt: row.payment_created_at ?? refund.createdAt,
            }
          : null,
      order:
        row?.order_id && row.order_customer_id
          ? {
              id: row.order_id,
              customerId: row.order_customer_id,
              status: row.order_status ?? MasterOrderStatus.PENDING_PAYMENT,
              totalMinor: row.order_total_minor ?? 0,
              currency: row.order_currency ?? "NGN",
              createdAt: row.order_created_at ?? refund.createdAt,
            }
          : null,
      customer:
        row?.customer_id && row.customer_name
          ? {
              id: row.customer_id,
              name: row.customer_name,
            }
          : null,
      requestedBy:
        row?.requester_id && row.requester_name && row.requester_role
          ? {
              id: row.requester_id,
              name: row.requester_name,
              role: row.requester_role,
            }
          : null,
    };
  }

  async processRefund(
    user: AuthenticatedUser,
    reference: string,
    input: { amountMinor?: number; reason?: string },
  ): Promise<PaymentRefund> {
    const payment = await this.payments.findOneBy({ reference });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    const requestedAmountMinor = await this.validateRefundRequest(payment, input.amountMinor, {
      includePending: false,
    });

    const reason = input.reason?.trim() || null;
    const providerRefund = await this.paymentAdapter.refund({
      reference: payment.reference,
      amountMinor: requestedAmountMinor,
      currency: payment.currency,
      ...(reason ? { reason } : {}),
    });

    return this.refunds.save(
      this.refunds.create({
        paymentId: payment.id,
        reference: payment.reference,
        amountMinor: requestedAmountMinor,
        currency: payment.currency,
        status: providerRefund.status,
        reason,
        provider: payment.gateway,
        providerRefundId: providerRefund.providerRefundId,
        requestedBy: user.id,
        providerResponse: providerRefund.providerResponse,
      }),
    );
  }

  async requestRefund(
    user: AuthenticatedUser,
    reference: string,
    input: { amountMinor?: number; reason?: string; subOrderId?: string },
  ): Promise<PaymentRefund> {
    const payment = await this.payments.findOneBy({ reference });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    const order = await this.masterOrders.findOneBy({ id: payment.masterOrderId });

    if (!order || order.customerId !== user.id) {
      throw new NotFoundException("Payment not found");
    }

    const pendingRefundRequest = await this.refunds.findOne({
      where: { paymentId: payment.id, requestedBy: user.id, status: "PENDING" },
    });

    if (pendingRefundRequest) {
      throw new ConflictException("A refund request is already pending for this payment");
    }

    const calculatedSubOrderAmountMinor = input.subOrderId
      ? await this.calculateRejectedSubOrderRefundAmount(order, input.subOrderId)
      : null;
    const requestedAmountMinor = await this.validateRefundRequest(
      payment,
      input.amountMinor ?? calculatedSubOrderAmountMinor ?? undefined,
      {
        includePending: true,
      },
    );

    if (
      calculatedSubOrderAmountMinor !== null &&
      requestedAmountMinor > calculatedSubOrderAmountMinor
    ) {
      throw new BadRequestException("Refund amount exceeds rejected sub-order refundable balance");
    }

    const reason = input.reason?.trim() || null;

    try {
      return await this.refunds.save(
        this.refunds.create({
          paymentId: payment.id,
          reference: payment.reference,
          amountMinor: requestedAmountMinor,
          currency: payment.currency,
          status: "PENDING",
          reason,
          provider: payment.gateway,
          providerRefundId: null,
          requestedBy: user.id,
          providerResponse: input.subOrderId ? { requestedSubOrderId: input.subOrderId } : null,
        }),
      );
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException("A refund request is already pending for this payment");
      }

      throw error;
    }
  }

  private async calculateRejectedSubOrderRefundAmount(
    order: MasterOrder,
    subOrderId: string,
  ): Promise<number> {
    const subOrders = await this.subOrders.find({ where: { masterOrderId: order.id } });
    const target = subOrders.find((subOrder) => subOrder.id === subOrderId);

    if (!target) {
      throw new NotFoundException("Sub-order not found");
    }

    if (target.status !== SubOrderStatus.REJECTED) {
      throw new BadRequestException("Only rejected sub-orders can be refunded this way");
    }

    const subtotalMinor = target.subtotalMinor;
    const vatMinor = this.allocateBySubtotal(order.vatMinor, subtotalMinor, order.subtotalMinor);
    const discountMinor = this.allocateBySubtotal(
      order.discountMinor,
      subtotalMinor,
      order.subtotalMinor,
    );

    return Math.max(0, subtotalMinor + target.commissionMinor + vatMinor - discountMinor);
  }

  private async validateRefundRequest(
    payment: Payment,
    amountMinor: number | undefined,
    options: { includePending: boolean },
  ): Promise<number> {
    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException("Only successful payments can be refunded");
    }

    const requestedAmountMinor = amountMinor ?? payment.amountMinor;
    if (requestedAmountMinor <= 0 || requestedAmountMinor > payment.amountMinor) {
      throw new BadRequestException(
        "Refund amount must be greater than 0 and not exceed payment amount",
      );
    }

    const existingRefunds = await this.refunds.find({ where: { paymentId: payment.id } });
    const alreadyRefundedMinor = existingRefunds
      .filter((refund) =>
        options.includePending ? refund.status !== "FAILED" : refund.status === "SUCCESS",
      )
      .reduce((sum, refund) => sum + refund.amountMinor, 0);

    if (alreadyRefundedMinor + requestedAmountMinor > payment.amountMinor) {
      throw new BadRequestException("Refund amount exceeds remaining refundable balance");
    }

    return requestedAmountMinor;
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

  private async priceCart(input: InitiatePaymentDto): Promise<PricedLine[]> {
    const menuItemIds = input.items.map((item) => item.menuItemId);
    const menuItems = await this.menuItems.findBy({ id: In(menuItemIds) });
    const menuItemById = new Map(menuItems.map((item) => [item.id, item]));
    const modifierIds = input.items.flatMap((item) =>
      (item.modifiers ?? []).map((modifier) => modifier.modifierId),
    );
    const modifiers = modifierIds.length
      ? await this.modifiers.findBy({ id: In(modifierIds) })
      : [];
    const modifierById = new Map(modifiers.map((modifier) => [modifier.id, modifier]));
    const lines: PricedLine[] = [];

    for (const inputItem of input.items) {
      const item = menuItemById.get(inputItem.menuItemId);

      if (!item) {
        throw new BadRequestException(`Menu item with ID "${inputItem.menuItemId}" was not found`);
      }
      if (!item.isAvailable) {
        throw new BadRequestException(`Menu item "${item.name}" is currently unavailable`);
      }

      const selectedModifiers = (inputItem.modifiers ?? []).map((selected) => {
        const modifier = modifierById.get(selected.modifierId);

        if (!modifier) {
          throw new BadRequestException(`Modifier with ID "${selected.modifierId}" was not found`);
        }
        if (!modifier.isAvailable) {
          throw new BadRequestException(
            `Modifier "${modifier.name}" for item "${item.name}" is currently unavailable`,
          );
        }
        if (modifier.outletId !== item.outletId) {
          throw new BadRequestException(
            `Modifier "${modifier.name}" does not belong to the same outlet as item "${item.name}"`,
          );
        }

        return modifier;
      });
      const modifierTotalMinor = selectedModifiers.reduce(
        (sum, modifier) => sum + modifier.priceDeltaMinor,
        0,
      );
      const baseUnitPriceMinor = item.getCurrentPriceMinor();
      const unitPriceMinor = baseUnitPriceMinor + modifierTotalMinor;

      lines.push({
        outletId: item.outletId,
        menuItemId: item.id,
        itemNameSnapshot: item.name,
        baseUnitPriceMinor,
        unitPriceMinor,
        quantity: inputItem.quantity,
        lineTotalMinor: unitPriceMinor * inputItem.quantity,
        customerNote: inputItem.customerNote || null,
        modifiersSnapshot: selectedModifiers.map((modifier) => ({
          id: modifier.id,
          name: modifier.name,
          priceDeltaMinor: modifier.priceDeltaMinor,
        })),
      });
    }

    return lines;
  }

  private ensureOutletsAreOnline(outletIds: string[], outletById: Map<string, Outlet>): void {
    for (const outletId of outletIds) {
      const outlet = outletById.get(outletId);

      if (!outlet || !outlet.isOnline) {
        throw new BadRequestException("One or more outlets are currently offline");
      }
    }
  }

  private async calculatePromoDiscount(
    input: InitiatePaymentDto,
    context: {
      subtotalMinor: number;
      deliveryFeeMinor: number;
      outletIds: string[];
      grouped: Map<string, PricedLine[]>;
    },
  ): Promise<number> {
    const code = input.promoCode?.trim().toUpperCase();
    if (!code) {
      return 0;
    }

    const promo = await this.promos.findOneBy({ code });
    const now = new Date();
    if (!promo || !promo.isActive || promo.startsAt > now || promo.endsAt < now) {
      throw new BadRequestException("Promo code is invalid or expired");
    }
    if (promo.scope === "OUTLET") {
      if (!promo.outletId || !context.outletIds.includes(promo.outletId)) {
        throw new BadRequestException("Promo code is not valid for this outlet");
      }
    }

    const basisMinor =
      promo.discountTarget === "DELIVERY"
        ? context.deliveryFeeMinor
        : promo.scope === "OUTLET" && promo.outletId
          ? (context.grouped
              .get(promo.outletId)
              ?.reduce((sum, line) => sum + line.lineTotalMinor, 0) ?? 0)
          : context.subtotalMinor;

    return Math.min(basisMinor, Math.round((basisMinor * promo.discountPercent) / 100));
  }

  // ---------------------------------------------------------------------------
  // Banks List
  // ---------------------------------------------------------------------------

  async getBanks(): Promise<Array<{ code: string; name: string }>> {
    const paymentsConfig = this.configService.get("payments", { infer: true });

    // Query configured Paystack base URL if paystack is active, otherwise default to Paystack's public endpoint
    const url =
      paymentsConfig.provider === "paystack"
        ? `${paymentsConfig.paystack.baseUrl}/bank?currency=NGN`
        : "https://api.paystack.co/bank?currency=NGN";

    const headers: Record<string, string> = {};
    if (paymentsConfig.provider === "paystack" && paymentsConfig.paystack.secretKey) {
      headers["authorization"] = `Bearer ${paymentsConfig.paystack.secretKey}`;
    }

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Paystack bank fetch failed with status ${response.status}`);
      }
      const payload = (await response.json()) as {
        status: boolean;
        message?: string;
        data?: Array<{ code: string; name: string }>;
      };
      if (!payload.status || !Array.isArray(payload.data)) {
        throw new Error(payload.message || "Failed to parse bank list from response");
      }
      return payload.data.map((b: { code: string; name: string }) => ({
        code: b.code,
        name: b.name,
      }));
    } catch (err) {
      this.logger.error(`Failed to fetch bank list: ${(err as Error).message}`);
      throw new Error(`Could not load bank listings: ${(err as Error).message}`);
    }
  }

  async resolveBankAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountNumber: string; accountName: string; bankCode: string }> {
    const paymentsConfig = this.configService.get("payments", { infer: true });

    if (paymentsConfig.provider !== "paystack") {
      return {
        accountNumber,
        accountName: "Demo Settlement Account",
        bankCode,
      };
    }

    try {
      const response = await fetch(
        `${paymentsConfig.paystack.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            authorization: `Bearer ${paymentsConfig.paystack.secretKey}`,
          },
        },
      );
      if (!response.ok) {
        throw new Error(`Paystack account verification failed with status ${response.status}`);
      }
      const payload = (await response.json()) as {
        status: boolean;
        message?: string;
        data?: {
          account_number: string;
          account_name: string;
          bank_id: number;
        };
      };
      if (!payload.status || !payload.data) {
        throw new Error(payload.message || "Invalid response structure from Paystack");
      }
      return {
        accountNumber: payload.data.account_number,
        accountName: payload.data.account_name,
        bankCode,
      };
    } catch (err) {
      this.logger.error(`Failed to resolve bank account: ${(err as Error).message}`);
      throw new BadRequestException(
        `Could not verify bank account details: ${(err as Error).message}`,
      );
    }
  }

  private normalizeRecipientPhone(phone: string | undefined): string | null {
    if (!phone) {
      return null;
    }

    try {
      return normalizeNigerianPhoneNumber(phone);
    } catch {
      throw new BadRequestException("Recipient phone must be a valid Nigerian mobile number");
    }
  }

  private normalizeReturnUrl(returnUrl: string | undefined): string | undefined {
    const trimmed = returnUrl?.trim();
    if (!trimmed) {
      return undefined;
    }

    try {
      return new URL(trimmed).toString();
    } catch {
      throw new BadRequestException("Payment return URL must be a valid absolute URL");
    }
  }
}

function randomSixDigitCode(): string {
  return Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
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

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError: unknown = error.driverError;
  if (typeof driverError !== "object" || driverError === null || !("code" in driverError)) {
    return false;
  }

  return driverError.code === "23505";
}
