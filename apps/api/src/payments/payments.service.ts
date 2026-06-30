import { randomUUID } from "node:crypto";

import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";

import { Customer } from "../auth/customer.entity";
import type { AuthenticatedUser } from "../auth/authenticated-user";
import { PiiCryptoService } from "../common/security/pii-crypto.service";
import type { ApplicationConfig } from "../config/configuration";
import { DeliveryService } from "../delivery/delivery.service";
import { ItemModifier } from "../catalog/item-modifier.entity";
import { MenuItem } from "../catalog/menu-item.entity";
import { Outlet } from "../outlets/outlet.entity";
import { RealtimeService } from "../realtime/realtime.service";
import { MasterOrder } from "../orders/master-order.entity";
import { OrderLineItem } from "../orders/order-line-item.entity";
import { MasterOrderStatus } from "../orders/order-status.enum";
import { SubOrder } from "../orders/sub-order.entity";
import type { InitiatePaymentDto } from "./dto/payment.dto";
import { Payment, PaymentStatus } from "./payment.entity";
import { PAYMENT_ADAPTER, type PaymentAdapter, type PaymentSplitRoute } from "./payment-adapter";

interface PricedLine {
  outletId: string;
  menuItemId: string;
  itemNameSnapshot: string;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
  modifiersSnapshot: Array<{ id: string; name: string; priceDeltaMinor: number }>;
}

@Injectable()
export class PaymentsService {
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
    private readonly dataSource: DataSource,
    private readonly delivery: DeliveryService,
    private readonly piiCrypto: PiiCryptoService,
    configService: ConfigService<ApplicationConfig, true>,
    @Inject(PAYMENT_ADAPTER) private readonly paymentAdapter: PaymentAdapter,
    private readonly realtime: RealtimeService,
  ) {
    const paymentsConfig = configService.get("payments", { infer: true });

    this.platformCommissionBps = paymentsConfig.platformCommissionBps;
    this.vatBps = paymentsConfig.vatBps;
    this.deliveryFeeMinor = paymentsConfig.deliveryFeeMinor;
  }

  async initiate(user: AuthenticatedUser, input: InitiatePaymentDto) {
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
    const grouped = new Map<string, PricedLine[]>();

    for (const line of pricedLines) {
      grouped.set(line.outletId, [...(grouped.get(line.outletId) ?? []), line]);
    }

    const outletIds = [...grouped.keys()];
    const outlets = await this.outlets.findBy({ id: In(outletIds) });
    const outletById = new Map(outlets.map((outlet) => [outlet.id, outlet]));
    const subtotalMinor = pricedLines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
    const deliveryFeeMinor = input.deliveryMode === "DELIVERY" ? this.deliveryFeeMinor : 0;
    const serviceFeeMinor = 0;
    const vatMinor = outletIds.reduce((sum, outletId) => {
      const outletSubtotalMinor = grouped
        .get(outletId)!
        .reduce((lineSum, line) => lineSum + line.lineTotalMinor, 0);
      const vatBps = outletById.get(outletId)?.vatBps ?? this.vatBps;

      return sum + Math.round((outletSubtotalMinor * vatBps) / 10_000);
    }, 0);
    const totalMinor = subtotalMinor + deliveryFeeMinor + serviceFeeMinor + vatMinor;
    const splitRoutes: PaymentSplitRoute[] = outletIds.map((outletId) => {
      const grossMinor = grouped.get(outletId)!.reduce((sum, line) => sum + line.lineTotalMinor, 0);
      const commissionMinor = Math.round((grossMinor * this.platformCommissionBps) / 10_000);

      return {
        outletId,
        subaccountCode: outletById.get(outletId)?.momentSubaccountCode ?? null,
        grossMinor,
        commissionMinor,
        netMinor: grossMinor - commissionMinor,
      };
    });
    const reference = `RSC-${randomUUID()}`;
    const customerEmail = this.piiCrypto.decrypt(customer.emailEncrypted);

    const providerPayment = await this.paymentAdapter.initiate({
      email: customerEmail,
      amountMinor: totalMinor,
      currency: "NGN",
      reference,
      splitRoutes,
    });

    const persisted = await this.dataSource.transaction(async (manager) => {
      const masterOrder = await manager.save(
        manager.create(MasterOrder, {
          customerId: user.id,
          subtotalMinor,
          deliveryFeeMinor,
          serviceFeeMinor,
          vatMinor,
          discountMinor: 0,
          totalMinor,
          currency: "NGN",
          deliveryMode: input.deliveryMode,
          deliveryAddress: input.deliveryAddress ?? null,
          deliveryLatitude: input.deliveryLatitude ?? null,
          deliveryLongitude: input.deliveryLongitude ?? null,
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
            subtotalMinor: route.grossMinor,
            commissionMinor: route.commissionMinor,
            netMinor: route.netMinor,
          }),
        );
        subOrders.push(subOrder);
        this.realtime.emitSuborderNew(subOrder);

        for (const line of grouped.get(route.outletId)!) {
          await manager.save(
            manager.create(OrderLineItem, {
              masterOrderId: masterOrder.id,
              subOrderId: subOrder.id,
              outletId: route.outletId,
              menuItemId: line.menuItemId,
              itemNameSnapshot: line.itemNameSnapshot,
              unitPriceMinor: line.unitPriceMinor,
              quantity: line.quantity,
              lineTotalMinor: line.lineTotalMinor,
              currency: "NGN",
              modifiersSnapshot: line.modifiersSnapshot,
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

    return {
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
        totalMinor,
        currency: "NGN",
      },
      splitBreakdown: splitRoutes,
    };
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

      if (!item || !item.isAvailable) {
        throw new BadRequestException("One or more menu items are unavailable");
      }

      const selectedModifiers = (inputItem.modifiers ?? []).map((selected) => {
        const modifier = modifierById.get(selected.modifierId);

        if (!modifier || !modifier.isAvailable || modifier.outletId !== item.outletId) {
          throw new BadRequestException("One or more modifiers are unavailable");
        }

        return modifier;
      });
      const modifierTotalMinor = selectedModifiers.reduce(
        (sum, modifier) => sum + modifier.priceDeltaMinor,
        0,
      );
      const unitPriceMinor = item.priceMinor + modifierTotalMinor;

      lines.push({
        outletId: item.outletId,
        menuItemId: item.id,
        itemNameSnapshot: item.name,
        unitPriceMinor,
        quantity: inputItem.quantity,
        lineTotalMinor: unitPriceMinor * inputItem.quantity,
        modifiersSnapshot: selectedModifiers.map((modifier) => ({
          id: modifier.id,
          name: modifier.name,
          priceDeltaMinor: modifier.priceDeltaMinor,
        })),
      });
    }

    return lines;
  }
}

function randomSixDigitCode(): string {
  return Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
}
