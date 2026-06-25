import { BadGatewayException, ConflictException, UnauthorizedException } from "@nestjs/common";
import type { Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PiiCryptoService } from "../common/security/pii-crypto.service";
import { AuthService } from "./auth.service";
import { Customer } from "./customer.entity";
import { CustomerStatus } from "./customer-status.enum";
import type { EmailSender } from "./email/email-sender";
import type { PhoneOtpService } from "./otp/phone-otp.service";
import type { SmsSender } from "./sms/sms-sender";

describe(AuthService.name, () => {
  const customerId = "2abf9577-027c-4936-83a8-e004fd56a46e";
  let customers: {
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let piiCrypto: {
    searchHash: ReturnType<typeof vi.fn>;
    encrypt: ReturnType<typeof vi.fn>;
  };
  let phoneOtp: {
    generateCode: ReturnType<typeof vi.fn>;
    store: ReturnType<typeof vi.fn>;
    storeEmail: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
    revokeEmail: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
    verifyEmail: ReturnType<typeof vi.fn>;
  };
  let smsSender: { sendPhoneVerification: ReturnType<typeof vi.fn> };
  let emailSender: { sendWelcomeVerification: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    customers = {
      findOneBy: vi.fn().mockResolvedValue(null),
      create: vi.fn((value: Partial<Customer>) => Object.assign(new Customer(), value)),
      save: vi.fn((customer: Customer) => {
        customer.id ||= customerId;
        return Promise.resolve(customer);
      }),
    };
    piiCrypto = {
      searchHash: vi.fn((value: string) => `hash:${value}`),
      encrypt: vi.fn((value: string) => `encrypted:${value}`),
    };
    phoneOtp = {
      generateCode: vi.fn().mockReturnValueOnce("482901").mockReturnValue("193847"),
      store: vi.fn().mockResolvedValue(undefined),
      storeEmail: vi.fn().mockResolvedValue(undefined),
      revoke: vi.fn().mockResolvedValue(undefined),
      revokeEmail: vi.fn().mockResolvedValue(undefined),
      verify: vi.fn().mockResolvedValue("VERIFIED"),
      verifyEmail: vi.fn().mockResolvedValue("VERIFIED"),
    };
    smsSender = {
      sendPhoneVerification: vi.fn().mockResolvedValue(undefined),
    };
    emailSender = {
      sendWelcomeVerification: vi.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      customers as unknown as Repository<Customer>,
      piiCrypto as unknown as PiiCryptoService,
      phoneOtp as unknown as PhoneOtpService,
      smsSender as SmsSender,
      emailSender as EmailSender,
    );
  });

  it("creates an unverified encrypted customer and sends phone and email OTPs", async () => {
    const result = await service.register({
      name: "Ada Okafor",
      phone: "08031234567",
      email: "ADA@EXAMPLE.COM",
      password: "SecureP@ss1",
    });

    const saved = customers.save.mock.calls.at(-1)?.[0] as Customer | undefined;

    expect(saved).toMatchObject({
      name: "Ada Okafor",
      phoneEncrypted: "encrypted:2348031234567",
      phoneHash: "hash:2348031234567",
      emailEncrypted: "encrypted:ada@example.com",
      emailHash: "hash:ada@example.com",
      status: CustomerStatus.UNVERIFIED,
    });
    expect(saved?.passwordHash).toContain(":");
    expect(phoneOtp.store).toHaveBeenCalledWith(customerId, "482901");
    expect(phoneOtp.storeEmail).toHaveBeenCalledWith(customerId, "193847");
    expect(smsSender.sendPhoneVerification).toHaveBeenCalledWith({
      phone: "2348031234567",
      code: "482901",
      expiresInMinutes: 10,
    });
    expect(emailSender.sendWelcomeVerification).toHaveBeenCalledWith({
      email: "ada@example.com",
      name: "Ada Okafor",
      code: "193847",
      expiresInMinutes: 10,
    });
    expect(result).toEqual({
      customerId,
      status: CustomerStatus.UNVERIFIED,
      otpExpiresInSeconds: 600,
      verificationChannels: { email: false, phone: false },
    });
  });

  it("resends verification for the same unverified customer", async () => {
    const existing = Object.assign(new Customer(), {
      id: customerId,
      name: "Ada Okafor",
      phoneHash: "hash:2348031234567",
      emailHash: "hash:ada@example.com",
      passwordHash: "salt:key",
      status: CustomerStatus.UNVERIFIED,
    });
    customers.findOneBy.mockResolvedValueOnce(existing).mockResolvedValueOnce(existing);

    await service.register({
      name: "Ada Updated",
      phone: "08031234567",
      email: "ada@example.com",
      password: "SecureP@ss1",
    });

    expect(customers.create).not.toHaveBeenCalled();
    expect(customers.save).toHaveBeenCalledWith(existing);
    expect(smsSender.sendPhoneVerification).toHaveBeenCalledOnce();
    expect(emailSender.sendWelcomeVerification).toHaveBeenCalledOnce();
  });

  it("does not let a resend replace the pending account email", async () => {
    const existing = Object.assign(new Customer(), {
      id: customerId,
      phoneHash: "hash:2348031234567",
      emailHash: "hash:original@example.com",
      passwordHash: "salt:key",
      status: CustomerStatus.UNVERIFIED,
    });
    customers.findOneBy.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);

    await expect(
      service.register({
        name: "Ada Okafor",
        phone: "08031234567",
        email: "replacement@example.com",
        password: "SecureP@ss1",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(customers.save).not.toHaveBeenCalled();
    expect(smsSender.sendPhoneVerification).not.toHaveBeenCalled();
    expect(emailSender.sendWelcomeVerification).not.toHaveBeenCalled();
  });

  it("rejects an identity already attached to an active account", async () => {
    customers.findOneBy.mockResolvedValueOnce(
      Object.assign(new Customer(), {
        id: customerId,
        status: CustomerStatus.ACTIVE,
      }),
    );

    await expect(
      service.register({
        name: "Ada Okafor",
        phone: "08031234567",
        email: "ada@example.com",
        password: "SecureP@ss1",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("revokes OTPs when Termii delivery fails", async () => {
    smsSender.sendPhoneVerification.mockRejectedValue(
      new BadGatewayException("Unable to send verification code"),
    );

    await expect(
      service.register({
        name: "Ada Okafor",
        phone: "08031234567",
        email: "ada@example.com",
        password: "SecureP@ss1",
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(phoneOtp.revoke).toHaveBeenCalledWith(customerId);
    expect(phoneOtp.revokeEmail).toHaveBeenCalledWith(customerId);
  });

  it("revokes OTPs when Resend delivery fails", async () => {
    emailSender.sendWelcomeVerification.mockRejectedValue(
      new BadGatewayException("Unable to send email verification code"),
    );

    await expect(
      service.register({
        name: "Ada Okafor",
        phone: "08031234567",
        email: "ada@example.com",
        password: "SecureP@ss1",
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(phoneOtp.revoke).toHaveBeenCalledWith(customerId);
    expect(phoneOtp.revokeEmail).toHaveBeenCalledWith(customerId);
  });

  it("activates the account after a correct OTP", async () => {
    const customer = Object.assign(new Customer(), {
      id: customerId,
      status: CustomerStatus.UNVERIFIED,
      phoneVerifiedAt: null,
    });
    customers.findOneBy.mockResolvedValue(customer);

    const result = await service.verifyPhone({
      phone: "08031234567",
      code: "482901",
    });

    expect(phoneOtp.verify).toHaveBeenCalledWith(customerId, "482901");
    const savedCustomer = customers.save.mock.calls.at(-1)?.[0] as Customer | undefined;

    expect(savedCustomer?.status).toBe(CustomerStatus.ACTIVE);
    expect(savedCustomer?.phoneVerifiedAt).toBeInstanceOf(Date);
    expect(result.status).toBe(CustomerStatus.ACTIVE);
    expect(result.phoneVerifiedAt).toBeTypeOf("string");
    expect(result.verificationChannels).toEqual({ email: false, phone: true });
  });

  it("records email verification independently", async () => {
    const customer = Object.assign(new Customer(), {
      id: customerId,
      status: CustomerStatus.UNVERIFIED,
      phoneVerifiedAt: null,
      emailVerifiedAt: null,
    });
    customers.findOneBy.mockResolvedValue(customer);

    const result = await service.verifyEmail({
      email: "ADA@EXAMPLE.COM",
      code: "193847",
    });

    expect(phoneOtp.verifyEmail).toHaveBeenCalledWith(customerId, "193847");
    const savedCustomer = customers.save.mock.calls.at(-1)?.[0] as Customer | undefined;

    expect(savedCustomer?.status).toBe(CustomerStatus.UNVERIFIED);
    expect(savedCustomer?.emailVerifiedAt).toBeInstanceOf(Date);
    expect(result.emailVerifiedAt).toBeTypeOf("string");
    expect(result.verificationChannels).toEqual({ email: true, phone: false });
  });

  it.each(["INVALID", "EXPIRED"] as const)("rejects an %s OTP", async (result) => {
    customers.findOneBy.mockResolvedValue(
      Object.assign(new Customer(), {
        id: customerId,
        status: CustomerStatus.UNVERIFIED,
      }),
    );
    phoneOtp.verify.mockResolvedValue(result);

    await expect(
      service.verifyPhone({ phone: "08031234567", code: "000000" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(customers.save).not.toHaveBeenCalled();
  });
});
