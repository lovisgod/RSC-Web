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
import type { UpdatePlatformChargesDto } from "./dto/platform-charges.dto";
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
    const platformCharges = await this.getPlatformCharges();
    const grouped = new Map<string, PricedLine[]>();

    for (const line of pricedLines) {
      grouped.set(line.outletId, [...(grouped.get(line.outletId) ?? []), line]);
    }

    const outletIds = [...grouped.keys()];
    const outlets = await this.outlets.findBy({ id: In(outletIds) });
    const outletById = new Map(outlets.map((outlet) => [outlet.id, outlet]));

    this.ensureOutletsAreOnline(outletIds, outletById);

    if (input.deliveryMode === "DELIVERY") {
      this.ensureOutletsCanDeliver(input, outletIds, outletById);
    }

    const subtotalMinor = pricedLines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
    const deliveryFeeMinor =
      input.deliveryMode === "DELIVERY" ? platformCharges.deliveryFeeMinor : 0;
    const serviceFeeMinor = platformCharges.serviceFeeMinor;
    const vatMinor = outletIds.reduce((sum, outletId) => {
      const outletSubtotalMinor = grouped
        .get(outletId)!
        .reduce((lineSum, line) => lineSum + line.lineTotalMinor, 0);
      const vatBps = outletById.get(outletId)?.vatBps ?? platformCharges.defaultVatBps;

      return sum + Math.round((outletSubtotalMinor * vatBps) / 10_000);
    }, 0);
    const totalMinor = subtotalMinor + deliveryFeeMinor + serviceFeeMinor + vatMinor;
    const splitRoutes: PaymentSplitRoute[] = outletIds.map((outletId) => {
      const grossMinor = grouped.get(outletId)!.reduce((sum, line) => sum + line.lineTotalMinor, 0);
      const commissionMinor = Math.round(
        (grossMinor * platformCharges.platformCommissionBps) / 10_000,
      );

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
            pickupCode: randomSixDigitCode(),
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

  private ensureOutletsCanDeliver(
    input: InitiatePaymentDto,
    outletIds: string[],
    outletById: Map<string, Outlet>,
  ): void {
    const latitude = input.deliveryLatitude;
    const longitude = input.deliveryLongitude;

    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException("Delivery address and coordinates are required");
    }

    for (const outletId of outletIds) {
      const outlet = outletById.get(outletId);

      if (!outlet) {
        throw new BadRequestException("One or more outlets are unavailable");
      }

      if (outlet.latitude === null || outlet.longitude === null) {
        continue;
      }

      const distanceKm = distanceBetweenKm(latitude, longitude, outlet.latitude, outlet.longitude);

      if (distanceKm > outlet.deliveryRadiusKm) {
        throw new BadRequestException(
          `Delivery address is outside ${outlet.name}'s delivery radius`,
        );
      }
    }
  }

  private ensureOutletsAreOnline(outletIds: string[], outletById: Map<string, Outlet>): void {
    for (const outletId of outletIds) {
      const outlet = outletById.get(outletId);

      if (!outlet || !outlet.isOnline) {
        throw new BadRequestException("One or more outlets are currently offline");
      }
    }
  }
}

function randomSixDigitCode(): string {
  return Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
}

function distanceBetweenKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const earthRadiusKm = 6_371;
  const latA = toRadians(latitudeA);
  const latB = toRadians(latitudeB);
  const deltaLat = toRadians(latitudeB - latitudeA);
  const deltaLon = toRadians(longitudeB - longitudeA);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
