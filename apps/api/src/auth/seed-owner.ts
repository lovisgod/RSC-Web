import "reflect-metadata";

import { parseArgs } from "node:util";

import dataSource from "../database/data-source";
import { PiiCryptoService } from "../common/security/pii-crypto.service";
import { Customer } from "./customer.entity";
import { CustomerStatus } from "./customer-status.enum";
import { hashPassword } from "./password";
import { normalizeNigerianPhoneNumber } from "./phone-number";
import { UserRole } from "./user-role.enum";

const defaultOwner = {
  name: "RSC Owner",
  email: "owner@example.com",
  phone: "08030000000",
  password: "password",
};

function ownerSeedInput() {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      password: { type: "string" },
    },
  });
  const name = (values.name ?? process.env.OWNER_NAME ?? defaultOwner.name).trim();
  const email = (values.email ?? process.env.OWNER_EMAIL ?? defaultOwner.email)
    .trim()
    .toLowerCase();
  const phone = values.phone ?? process.env.OWNER_PHONE ?? defaultOwner.phone;
  const password = values.password ?? process.env.OWNER_PASSWORD ?? defaultOwner.password;

  if (!name) {
    throw new Error("OWNER_NAME cannot be empty");
  }
  if (!email) {
    throw new Error("OWNER_EMAIL cannot be empty");
  }
  if (!phone) {
    throw new Error("OWNER_PHONE cannot be empty");
  }
  if (!password) {
    throw new Error("OWNER_PASSWORD cannot be empty");
  }

  return { name, email, phone, password };
}

async function main(): Promise<void> {
  await dataSource.initialize();

  try {
    await dataSource.query(`ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'OWNER'`);

    const input = ownerSeedInput();
    const piiCrypto = new PiiCryptoService({
      get: () => ({
        piiEncryptionKey: process.env.PII_ENCRYPTION_KEY ?? "",
        piiHashPepper: process.env.PII_HASH_PEPPER ?? "",
        otpPepper: process.env.OTP_PEPPER ?? "",
        jwtSecret: process.env.JWT_SECRET ?? "",
        accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
        refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 604_800),
        adminInactivityTimeoutSeconds: Number(
          process.env.ADMIN_INACTIVITY_TIMEOUT_SECONDS ?? 1_800,
        ),
      }),
    } as never);
    const users = dataSource.getRepository(Customer);
    const phone = normalizeNigerianPhoneNumber(input.phone);
    const emailHash = piiCrypto.searchHash(input.email);
    const phoneHash = piiCrypto.searchHash(phone);
    const existingByEmail = await users.findOneBy({ emailHash });
    const existingByPhone = await users.findOneBy({ phoneHash });

    if (existingByPhone && existingByPhone.id !== existingByEmail?.id) {
      throw new Error("OWNER_PHONE already belongs to another account");
    }

    const now = new Date();
    const owner =
      existingByEmail ??
      users.create({
        emailHash,
        phoneHash,
        createdAt: now,
      });

    owner.name = input.name;
    owner.emailEncrypted = piiCrypto.encrypt(input.email);
    owner.phoneEncrypted = piiCrypto.encrypt(phone);
    owner.passwordHash = await hashPassword(input.password);
    owner.status = CustomerStatus.ACTIVE;
    owner.role = UserRole.OWNER;
    owner.outletId = null;
    owner.emailVerifiedAt = now;
    owner.phoneVerifiedAt = now;

    const saved = await users.save(owner);

    console.log(`Seeded owner: ${saved.id}`);
    console.table([
      {
        role: saved.role,
        name: saved.name,
        email: input.email,
        phone,
        password: input.password,
      },
    ]);
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
