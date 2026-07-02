import "reflect-metadata";

import dataSource from "../database/data-source";
import { PiiCryptoService } from "../common/security/pii-crypto.service";
import { Customer } from "./customer.entity";
import { CustomerStatus } from "./customer-status.enum";
import { hashPassword } from "./password";
import { normalizeNigerianPhoneNumber } from "./phone-number";
import { UserRole } from "./user-role.enum";

const defaultSuperAdmin = {
  name: "RSC Super Admin",
  email: "super.admin@yopmail.com",
  phone: "08030000001",
  password: "password",
};

async function main(): Promise<void> {
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
    const name = (process.env.SUPER_ADMIN_NAME ?? defaultSuperAdmin.name).trim();
    const email = (process.env.SUPER_ADMIN_EMAIL ?? defaultSuperAdmin.email).trim().toLowerCase();
    const phone = normalizeNigerianPhoneNumber(
      process.env.SUPER_ADMIN_PHONE ?? defaultSuperAdmin.phone,
    );
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
    superAdmin.passwordHash = await hashPassword(
      process.env.SUPER_ADMIN_PASSWORD ?? defaultSuperAdmin.password,
    );
    superAdmin.status = CustomerStatus.ACTIVE;
    superAdmin.role = UserRole.SUPER_ADMIN;
    superAdmin.outletId = null;
    superAdmin.emailVerifiedAt = now;
    superAdmin.phoneVerifiedAt = now;

    const password = process.env.SUPER_ADMIN_PASSWORD ?? defaultSuperAdmin.password;
    const saved = await users.save(superAdmin);

    console.log(`Seeded super admin: ${saved.id}`);
    console.table([
      {
        role: saved.role,
        name: saved.name,
        email,
        phone,
        password,
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
