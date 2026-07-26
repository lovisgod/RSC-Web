import type { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";

import { CustomerStatus } from "../../src/auth/customer-status.enum";
import { Customer } from "../../src/auth/customer.entity";
import type { AuthenticatedUser } from "../../src/auth/authenticated-user";
import { UserRole } from "../../src/auth/user-role.enum";
import { PiiCryptoService } from "../../src/common/security/pii-crypto.service";
import { MasterOrderStatus, SubOrderStatus } from "../../src/orders/order-status.enum";
import { MasterOrder } from "../../src/orders/master-order.entity";
import { SubOrder } from "../../src/orders/sub-order.entity";
import { Outlet } from "../../src/outlets/outlet.entity";
import { Payment, PaymentStatus } from "../../src/payments/payment.entity";

let fixtureSequence = 0;

function nextIdentity(prefix: string): string {
  fixtureSequence += 1;
  return `${prefix}-${fixtureSequence}`;
}

export async function createUser(
  app: INestApplication,
  input: { role: UserRole; outletId?: string | null; name?: string },
): Promise<Customer> {
  const repository = app.get(DataSource).getRepository(Customer);
  const piiCrypto = app.get(PiiCryptoService);
  const identity = nextIdentity(input.role.toLowerCase());
  const phone = `234800${String(fixtureSequence).padStart(7, "0").slice(-7)}`;
  const email = `${identity}@example.com`;

  return repository.save(
    repository.create({
      name: input.name ?? identity,
      phoneEncrypted: piiCrypto.encrypt(phone),
      phoneHash: piiCrypto.searchHash(phone),
      emailEncrypted: piiCrypto.encrypt(email),
      emailHash: piiCrypto.searchHash(email),
      status: CustomerStatus.ACTIVE,
      role: input.role,
      outletId: input.outletId ?? null,
      avatarUrl: null,
      passwordHash: "integration-test-password-hash",
      phoneVerifiedAt: new Date(),
      emailVerifiedAt: new Date(),
      pendingPhoneEncrypted: null,
      pendingPhoneHash: null,
      pendingEmailEncrypted: null,
      pendingEmailHash: null,
      vehicleType: input.role === UserRole.RIDER ? "BIKE" : null,
      plateNumber: input.role === UserRole.RIDER ? nextIdentity("plate") : null,
      riderStatus: input.role === UserRole.RIDER ? "AVAILABLE" : null,
      fcmToken: null,
      notificationPreferences: {},
    }),
  );
}

export async function createOutlet(
  app: INestApplication,
  input: { name?: string; settlementSubaccountCode?: string | null } = {},
): Promise<Outlet> {
  const repository = app.get(DataSource).getRepository(Outlet);
  const identity = nextIdentity("outlet");

  return repository.save(
    repository.create({
      name: input.name ?? identity,
      description: null,
      address: "1 Integration Test Road",
      cuisineType: "Test cuisine",
      imageUrl: null,
      isOnline: true,
      settlementSubaccountCode:
        input.settlementSubaccountCode === undefined
          ? `TEST_SUBACCOUNT_${fixtureSequence}`
          : input.settlementSubaccountCode,
      vatBps: 750,
      latitude: 6.45,
      longitude: 3.4,
      deliveryRadiusKm: 15,
      ratingAverage: "0",
      ratingCount: 0,
    }),
  );
}

export async function createOrder(
  app: INestApplication,
  input: {
    customerId: string;
    riderId?: string | null;
    status?: MasterOrderStatus;
    subtotalMinor?: number;
    vatMinor?: number;
    totalMinor?: number;
    deliveryMode?: "DELIVERY" | "TAKEOUT";
    deliveryCode?: string;
    createdAt?: Date;
  },
): Promise<MasterOrder> {
  const repository = app.get(DataSource).getRepository(MasterOrder);

  return repository.save(
    repository.create({
      customerId: input.customerId,
      riderId: input.riderId ?? null,
      status: input.status ?? MasterOrderStatus.PENDING_PAYMENT,
      subtotalMinor: input.subtotalMinor ?? 10_000,
      deliveryFeeMinor: 0,
      serviceFeeMinor: 0,
      vatMinor: input.vatMinor ?? 750,
      discountMinor: 0,
      totalMinor: input.totalMinor ?? 10_750,
      currency: "NGN",
      deliveryMode: input.deliveryMode ?? "DELIVERY",
      deliveryAddress: "1 Integration Test Road",
      deliveryLatitude: 6.45,
      deliveryLongitude: 3.4,
      recipientPhone: null,
      paymentReference: null,
      deliveryCode: input.deliveryCode ?? "123456",
      preparationTime: null,
      ...(input.createdAt ? { createdAt: input.createdAt, updatedAt: input.createdAt } : {}),
    }),
  );
}

export async function createSubOrder(
  app: INestApplication,
  input: {
    masterOrderId: string;
    outletId: string;
    status?: SubOrderStatus;
    subtotalMinor?: number;
    commissionMinor?: number;
    updatedAt?: Date;
  },
): Promise<SubOrder> {
  const repository = app.get(DataSource).getRepository(SubOrder);
  const entity = repository.create({
    masterOrderId: input.masterOrderId,
    outletId: input.outletId,
    status: input.status ?? SubOrderStatus.PENDING,
    pickupCode: String(100000 + fixtureSequence).slice(-6),
    subtotalMinor: input.subtotalMinor ?? 5_000,
    commissionMinor: input.commissionMinor ?? 500,
    netMinor: (input.subtotalMinor ?? 5_000) - (input.commissionMinor ?? 500),
    currency: "NGN",
    preparationTime: null,
    preparationNote: null,
  });
  const saved = await repository.save(entity);

  if (input.updatedAt) {
    await repository.update(saved.id, { updatedAt: input.updatedAt });
    saved.updatedAt = input.updatedAt;
  }

  return saved;
}

export async function createPayment(
  app: INestApplication,
  input: {
    masterOrderId: string;
    status?: PaymentStatus;
    amountMinor?: number;
    reference?: string;
  },
): Promise<Payment> {
  const repository = app.get(DataSource).getRepository(Payment);

  return repository.save(
    repository.create({
      masterOrderId: input.masterOrderId,
      amountMinor: input.amountMinor ?? 10_750,
      currency: "NGN",
      gateway: "local",
      reference: input.reference ?? `RSC-TEST-${nextIdentity("payment")}`,
      status: input.status ?? PaymentStatus.PENDING,
      checkoutUrl: null,
      splitBreakdown: [],
      providerResponse: null,
    }),
  );
}

export function actor(id: string, role: UserRole): AuthenticatedUser {
  return {
    id,
    role,
    sessionId: `session-${id}`,
    accessTokenId: `token-${id}`,
  };
}
