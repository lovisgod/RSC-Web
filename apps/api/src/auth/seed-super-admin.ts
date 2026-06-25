import "reflect-metadata";

import dataSource from "../database/data-source";
import { PiiCryptoService } from "../common/security/pii-crypto.service";
import { Customer } from "./customer.entity";
import { CustomerStatus } from "./customer-status.enum";
import { hashPassword } from "./password";
import { normalizeNigerianPhoneNumber } from "./phone-number";
import { UserRole } from "./user-role.enum";

const requiredEnv = [
  "SUPER_ADMIN_NAME",
  "SUPER_ADMIN_EMAIL",
  "SUPER_ADMIN_PHONE",
  "SUPER_ADMIN_PASSWORD",
];

async function main(): Promise<void> {
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(`${key} is required`);
    }
  }

  await dataSource.initialize();

  try {
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
    const name = process.env.SUPER_ADMIN_NAME!.trim();
    const email = process.env.SUPER_ADMIN_EMAIL!.trim().toLowerCase();
    const phone = normalizeNigerianPhoneNumber(process.env.SUPER_ADMIN_PHONE!);
    const emailHash = piiCrypto.searchHash(email);
    const phoneHash = piiCrypto.searchHash(phone);
    const existingByEmail = await users.findOneBy({ emailHash });
    const existingByPhone = await users.findOneBy({ phoneHash });

    if (existingByPhone && existingByPhone.id !== existingByEmail?.id) {
      throw new Error("SUPER_ADMIN_PHONE already belongs to another account");
    }

    const now = new Date();
    const superAdmin =
      existingByEmail ??
      users.create({
        emailHash,
        phoneHash,
        createdAt: now,
      });

    superAdmin.name = name;
    superAdmin.emailEncrypted = piiCrypto.encrypt(email);
    superAdmin.phoneEncrypted = piiCrypto.encrypt(phone);
    superAdmin.passwordHash = await hashPassword(process.env.SUPER_ADMIN_PASSWORD!);
    superAdmin.status = CustomerStatus.ACTIVE;
    superAdmin.role = UserRole.SUPER_ADMIN;
    superAdmin.outletId = null;
    superAdmin.emailVerifiedAt = now;
    superAdmin.phoneVerifiedAt = now;

    const saved = await users.save(superAdmin);

    console.log(`Seeded super admin: ${saved.id}`);
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
