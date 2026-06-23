import { BadGatewayException, ConflictException, UnauthorizedException } from "@nestjs/common";
import type { Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PiiCryptoService } from "../common/security/pii-crypto.service";
import { AuthService } from "./auth.service";
import { Customer } from "./customer.entity";
import { CustomerStatus } from "./customer-status.enum";
import { PhoneOtpService } from "./otp/phone-otp.service";
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
    revoke: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };
  let smsSender: { sendPhoneVerification: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    customers = {
      findOneBy: vi.fn().mockResolvedValue(null),
      create: vi.fn((value: Partial<Customer>) => Object.assign(new Customer(), value)),
      save: vi.fn(async (customer: Customer) => {
        customer.id ||= customerId;
        return customer;
      }),
    };
    piiCrypto = {
      searchHash: vi.fn((value: string) => `hash:${value}`),
      encrypt: vi.fn((value: string) => `encrypted:${value}`),
    };
    phoneOtp = {
      generateCode: vi.fn(() => "482901"),
      store: vi.fn().mockResolvedValue(undefined),
      revoke: vi.fn().mockResolvedValue(undefined),
      verify: vi.fn().mockResolvedValue("VERIFIED"),
    };
    smsSender = {
      sendPhoneVerification: vi.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      customers as unknown as Repository<Customer>,
      piiCrypto as unknown as PiiCryptoService,
      phoneOtp as unknown as PhoneOtpService,
      smsSender as SmsSender,
    );
  });

  it("creates an unverified encrypted customer and sends a six-digit OTP", async () => {
    const result = await service.register({
      name: "Ada Okafor",
      phone: "08031234567",
      email: "ADA@EXAMPLE.COM",
    });

    expect(customers.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ada Okafor",
        phoneEncrypted: "encrypted:2348031234567",
        phoneHash: "hash:2348031234567",
        emailEncrypted: "encrypted:ada@example.com",
        emailHash: "hash:ada@example.com",
        status: CustomerStatus.UNVERIFIED,
      }),
    );
    expect(phoneOtp.store).toHaveBeenCalledWith(customerId, "482901");
    expect(smsSender.sendPhoneVerification).toHaveBeenCalledWith({
      phone: "2348031234567",
      code: "482901",
      expiresInMinutes: 10,
    });
    expect(result).toEqual({
      customerId,
      status: CustomerStatus.UNVERIFIED,
      otpExpiresInSeconds: 600,
    });
  });

  it("resends verification for the same unverified customer", async () => {
    const existing = Object.assign(new Customer(), {
      id: customerId,
      name: "Ada Okafor",
      phoneHash: "hash:2348031234567",
      emailHash: "hash:ada@example.com",
      status: CustomerStatus.UNVERIFIED,
    });
    customers.findOneBy.mockResolvedValueOnce(existing).mockResolvedValueOnce(existing);

    await service.register({
      name: "Ada Updated",
      phone: "08031234567",
      email: "ada@example.com",
    });

    expect(customers.create).not.toHaveBeenCalled();
    expect(customers.save).toHaveBeenCalledWith(existing);
    expect(smsSender.sendPhoneVerification).toHaveBeenCalledOnce();
  });

  it("does not let a resend replace the pending account email", async () => {
    const existing = Object.assign(new Customer(), {
      id: customerId,
      phoneHash: "hash:2348031234567",
      emailHash: "hash:original@example.com",
      status: CustomerStatus.UNVERIFIED,
    });
    customers.findOneBy.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);

    await expect(
      service.register({
        name: "Ada Okafor",
        phone: "08031234567",
        email: "replacement@example.com",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(customers.save).not.toHaveBeenCalled();
    expect(smsSender.sendPhoneVerification).not.toHaveBeenCalled();
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
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("revokes the OTP when Termii delivery fails", async () => {
    smsSender.sendPhoneVerification.mockRejectedValue(
      new BadGatewayException("Unable to send verification code"),
    );

    await expect(
      service.register({
        name: "Ada Okafor",
        phone: "08031234567",
        email: "ada@example.com",
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(phoneOtp.revoke).toHaveBeenCalledWith(customerId);
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
    expect(customers.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: CustomerStatus.ACTIVE,
        phoneVerifiedAt: expect.any(Date),
      }),
    );
    expect(result.status).toBe(CustomerStatus.ACTIVE);
    expect(result.phoneVerifiedAt).toBeTypeOf("string");
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
