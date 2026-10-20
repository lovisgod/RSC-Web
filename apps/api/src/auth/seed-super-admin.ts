import "reflect-metadata";

import { parseArgs } from "node:util";

import dataSource from "../database/data-source";
import { PiiCryptoService } from "../common/security/pii-crypto.service";
import { Customer } from "./customer.entity";
import { CustomerStatus } from "./customer-status.enum";
import { createEmailSenderFromEnv } from "./email/create-email-sender";
import { hashPassword } from "./password";
import { normalizeNigerianPhoneNumber } from "./phone-number";
import { UserRole } from "./user-role.enum";

const defaultSuperAdmin = {
  name: "DineOut Super Admin",
  email: "super.admin@yopmail.com",
  phone: "08030000001",
  password: "password",
};

function superAdminSeedInput() {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      password: { type: "string" },
      "skip-email": { type: "boolean" },
    },
  });

  const name = (values.name ?? process.env.SUPER_ADMIN_NAME ?? defaultSuperAdmin.name).trim();
  const email = (values.email ?? process.env.SUPER_ADMIN_EMAIL ?? defaultSuperAdmin.email)
    .trim()
    .toLowerCase();
  const phone = normalizeNigerianPhoneNumber(
    values.phone ?? process.env.SUPER_ADMIN_PHONE ?? defaultSuperAdmin.phone,
  );
  const password =
    values.password ?? process.env.SUPER_ADMIN_PASSWORD ?? defaultSuperAdmin.password;
  const skipEmail = values["skip-email"] ?? process.env.SKIP_EMAIL === "true";

  if (!name) {
    throw new Error("SUPER_ADMIN_NAME cannot be empty");
  }
  if (!email) {
    throw new Error("SUPER_ADMIN_EMAIL cannot be empty");
  }
  if (!phone) {
    throw new Error("SUPER_ADMIN_PHONE cannot be empty");
  }
  if (!password) {
    throw new Error("SUPER_ADMIN_PASSWORD cannot be empty");
  }

  return { name, email, phone, password, skipEmail };
}

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
    const input = superAdminSeedInput();
    const emailHash = piiCrypto.searchHash(input.email);
    const phoneHash = piiCrypto.searchHash(input.phone);
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

    superAdmin.name = input.name;
    superAdmin.emailEncrypted = piiCrypto.encrypt(input.email);
    superAdmin.phoneEncrypted = piiCrypto.encrypt(input.phone);
    superAdmin.passwordHash = await hashPassword(input.password);
    superAdmin.status = CustomerStatus.ACTIVE;
    superAdmin.role = UserRole.SUPER_ADMIN;
    superAdmin.outletId = null;
    superAdmin.emailVerifiedAt = now;
    superAdmin.phoneVerifiedAt = now;

    const saved = await users.save(superAdmin);

    console.log(`Seeded super admin: ${saved.id}`);
    console.table([
      {
        role: saved.role,
        name: saved.name,
        email: input.email,
        phone: input.phone,
        password: input.password,
      },
    ]);

    if (!input.skipEmail) {
      const emailSender = createEmailSenderFromEnv();
      try {
        console.log(`Sending credentials email to ${input.email}...`);
        await emailSender.sendTemporaryPassword({
          email: input.email,
          name: saved.name,
          role: "Super Admin",
          temporaryPassword: input.password,
        });
        console.log(`Email successfully sent to ${input.email}`);
      } catch (emailError) {
        console.error(
          `Failed to send email to ${input.email}: ${
            emailError instanceof Error ? emailError.message : String(emailError)
          }`,
        );
      }
    }
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
