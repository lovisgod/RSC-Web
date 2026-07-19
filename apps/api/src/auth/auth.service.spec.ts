import { BadGatewayException, ConflictException, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import type { Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PiiCryptoService } from "../common/security/pii-crypto.service";
import { Outlet } from "../outlets/outlet.entity";
import type { AuthSessionService } from "./auth-session.service";
import { AuthService } from "./auth.service";
import { Customer } from "./customer.entity";
import { CustomerStatus } from "./customer-status.enum";
import type { EmailSender } from "./email/email-sender";
import type { PhoneOtpService } from "./otp/phone-otp.service";
import { verifyPassword } from "./password";
import type { SmsSender } from "./sms/sms-sender";
import { UserRole } from "./user-role.enum";

function hashPasswordForTest(password: string): Promise<string> {
  return bcrypt.hash(password, 4);
}

describe(AuthService.name, () => {
  const customerId = "2abf9577-027c-4936-83a8-e004fd56a46e";
  let customers: {
    findOne: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let outlets: {
    findOneBy: ReturnType<typeof vi.fn>;
  };
  let piiCrypto: {
    searchHash: ReturnType<typeof vi.fn>;
    encrypt: ReturnType<typeof vi.fn>;
    decrypt: ReturnType<typeof vi.fn>;
  };
  let phoneOtp: {
    generateCode: ReturnType<typeof vi.fn>;
    store: ReturnType<typeof vi.fn>;
    storeEmail: ReturnType<typeof vi.fn>;
    storeRegistrationPhone: ReturnType<typeof vi.fn>;
    storeRegistrationEmail: ReturnType<typeof vi.fn>;
    storeProfileChangePhone: ReturnType<typeof vi.fn>;
    storeProfileChangeEmail: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
    revokeEmail: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
    verifyEmail: ReturnType<typeof vi.fn>;
    verifyRegistrationCode: ReturnType<typeof vi.fn>;
    verifyProfileChangeCode: ReturnType<typeof vi.fn>;
    storePasswordResetPhone: ReturnType<typeof vi.fn>;
    storePasswordResetEmail: ReturnType<typeof vi.fn>;
    revokePasswordReset: ReturnType<typeof vi.fn>;
    verifyPasswordResetPhone: ReturnType<typeof vi.fn>;
    verifyPasswordResetEmail: ReturnType<typeof vi.fn>;
  };
  let smsSender: {
    sendPhoneVerification: ReturnType<typeof vi.fn>;
    sendPasswordReset: ReturnType<typeof vi.fn>;
  };
  let emailSender: {
    sendWelcomeVerification: ReturnType<typeof vi.fn>;
    sendPasswordReset: ReturnType<typeof vi.fn>;
    sendTemporaryPassword: ReturnType<typeof vi.fn>;
    sendMarketing: ReturnType<typeof vi.fn>;
  };
  let sessions: { issueSession: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(() => {
    customers = {
      findOne: vi.fn().mockResolvedValue(null),
      findOneBy: vi.fn().mockResolvedValue(null),
      create: vi.fn((value: Partial<Customer>) => Object.assign(new Customer(), value)),
      save: vi.fn((customer: Customer) => {
        customer.id ||= customerId;
        return Promise.resolve(customer);
      }),
    };
    outlets = {
      findOneBy: vi.fn().mockResolvedValue(
        Object.assign(new Outlet(), {
          id: "4273e96c-2887-49a5-a6d5-269f007f04f0",
        }),
      ),
    };
    piiCrypto = {
      searchHash: vi.fn((value: string) => `hash:${value}`),
      encrypt: vi.fn((value: string) => `encrypted:${value}`),
      decrypt: vi.fn((value: string) => value.replace(/^encrypted:/, "")),
    };
    phoneOtp = {
      generateCode: vi.fn().mockReturnValueOnce("482901").mockReturnValue("193847"),
      store: vi.fn().mockResolvedValue(undefined),
      storeEmail: vi.fn().mockResolvedValue(undefined),
      storeRegistrationPhone: vi.fn().mockResolvedValue(undefined),
      storeRegistrationEmail: vi.fn().mockResolvedValue(undefined),
      storeProfileChangePhone: vi.fn().mockResolvedValue(undefined),
      storeProfileChangeEmail: vi.fn().mockResolvedValue(undefined),
      revoke: vi.fn().mockResolvedValue(undefined),
      revokeEmail: vi.fn().mockResolvedValue(undefined),
      verify: vi.fn().mockResolvedValue("VERIFIED"),
      verifyEmail: vi.fn().mockResolvedValue("VERIFIED"),
      verifyRegistrationCode: vi.fn().mockResolvedValue({
        result: "VERIFIED",
        customerId,
        channel: "phone",
      }),
      verifyProfileChangeCode: vi.fn().mockResolvedValue({
        result: "VERIFIED",
        customerId,
        channel: "phone",
      }),
      storePasswordResetPhone: vi.fn().mockResolvedValue(undefined),
      storePasswordResetEmail: vi.fn().mockResolvedValue(undefined),
      revokePasswordReset: vi.fn().mockResolvedValue(undefined),
      verifyPasswordResetPhone: vi.fn().mockResolvedValue("VERIFIED"),
      verifyPasswordResetEmail: vi.fn().mockResolvedValue("VERIFIED"),
    };
    smsSender = {
      sendPhoneVerification: vi.fn().mockResolvedValue(undefined),
      sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    };
    emailSender = {
      sendWelcomeVerification: vi.fn().mockResolvedValue(undefined),
      sendPasswordReset: vi.fn().mockResolvedValue(undefined),
      sendTemporaryPassword: vi.fn().mockResolvedValue(undefined),
      sendMarketing: vi.fn().mockResolvedValue(undefined),
    };
    sessions = {
      issueSession: vi.fn().mockResolvedValue({
        accessToken: "access.jwt",
        refreshToken: "refresh.jwt",
        accessTokenExpiresInSeconds: 900,
        refreshTokenExpiresInSeconds: 604800,
        user: { id: customerId, role: UserRole.CUSTOMER, outletId: null },
      }),
    };

    service = new AuthService(
      customers as unknown as Repository<Customer>,
      outlets as unknown as Repository<Outlet>,
      piiCrypto as unknown as PiiCryptoService,
      phoneOtp as unknown as PhoneOtpService,
      sessions as unknown as AuthSessionService,
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
      role: UserRole.CUSTOMER,
    });
    expect(saved?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(phoneOtp.storeRegistrationPhone).toHaveBeenCalledWith(customerId, "482901");
    expect(phoneOtp.storeRegistrationEmail).toHaveBeenCalledWith(customerId, "193847");
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

  it("logs in an active customer and issues a session", async () => {
    const customer = Object.assign(new Customer(), {
      id: customerId,
      status: CustomerStatus.ACTIVE,
      role: UserRole.CUSTOMER,
      emailHash: "hash:ada@example.com",
      passwordHash: await hashPasswordForTest("SecureP@ss1"),
    });
    customers.findOneBy.mockResolvedValue(customer);

    const result = await service.login({
      identifier: "ADA@EXAMPLE.COM",
      password: "SecureP@ss1",
    });

    expect(customers.findOneBy).toHaveBeenCalledWith({ emailHash: "hash:ada@example.com" });
    expect(sessions.issueSession).toHaveBeenCalledWith(customer);
    expect(result.accessToken).toBe("access.jwt");
  });

  it("rejects login for invalid credentials", async () => {
    const customer = Object.assign(new Customer(), {
      id: customerId,
      status: CustomerStatus.ACTIVE,
      role: UserRole.CUSTOMER,
      phoneHash: "hash:2348031234567",
      passwordHash: await hashPasswordForTest("SecureP@ss1"),
    });
    customers.findOneBy.mockResolvedValue(customer);

    await expect(
      service.login({
        identifier: "08031234567",
        password: "WrongP@ss1",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(sessions.issueSession).not.toHaveBeenCalled();
  });

  it("changes the active user's password after checking the current password", async () => {
    const customer = Object.assign(new Customer(), {
      id: customerId,
      status: CustomerStatus.ACTIVE,
      role: UserRole.CUSTOMER,
      passwordHash: await hashPasswordForTest("SecureP@ss1"),
    });
    customers.findOneBy.mockResolvedValue(customer);

    const result = await service.changePassword(
      {
        id: customerId,
        role: UserRole.CUSTOMER,
        sessionId: "session-id",
        accessTokenId: "access-token-id",
      },
      { currentPassword: "SecureP@ss1", newPassword: "BetterP@ss1" },
    );

    expect(result).toEqual({ passwordChanged: true });
    expect(customers.save).toHaveBeenCalledWith(customer);
    expect(await verifyPassword("BetterP@ss1", customer.passwordHash)).toBe(true);
  });

  it("sends password reset codes to both stored channels", async () => {
    const customer = Object.assign(new Customer(), {
      id: customerId,
      name: "Ada Okafor",
      status: CustomerStatus.ACTIVE,
      emailHash: "hash:ada@example.com",
      phoneEncrypted: "encrypted:2348031234567",
      emailEncrypted: "encrypted:ada@example.com",
      passwordHash: await hashPasswordForTest("SecureP@ss1"),
    });
    customers.findOneBy.mockResolvedValue(customer);

    const result = await service.forgotPassword({ identifier: "ADA@EXAMPLE.COM" });

    expect(result).toEqual({ sent: true, otpExpiresInSeconds: 600 });
    expect(phoneOtp.storePasswordResetPhone).toHaveBeenCalledWith(customerId, "482901");
    expect(phoneOtp.storePasswordResetEmail).toHaveBeenCalledWith(customerId, "193847");
    expect(smsSender.sendPasswordReset).toHaveBeenCalledWith({
      phone: "2348031234567",
      code: "482901",
      expiresInMinutes: 10,
    });
    expect(emailSender.sendPasswordReset).toHaveBeenCalledWith({
      email: "ada@example.com",
      name: "Ada Okafor",
      code: "193847",
      expiresInMinutes: 10,
    });
  });

  it("resets a password after a phone reset OTP verifies", async () => {
    const customer = Object.assign(new Customer(), {
      id: customerId,
      status: CustomerStatus.ACTIVE,
      phoneHash: "hash:2348031234567",
      passwordHash: await hashPasswordForTest("SecureP@ss1"),
    });
    customers.findOneBy.mockResolvedValue(customer);

    const result = await service.resetPassword({
      identifier: "08031234567",
      phoneCode: "482901",
      newPassword: "BetterP@ss1",
    });

    expect(result).toEqual({ passwordChanged: true });
    expect(phoneOtp.verifyPasswordResetPhone).toHaveBeenCalledWith(customerId, "482901");
    expect(phoneOtp.verifyPasswordResetEmail).not.toHaveBeenCalled();
    expect(phoneOtp.revokePasswordReset).toHaveBeenCalledWith(customerId);
    expect(await verifyPassword("BetterP@ss1", customer.passwordHash)).toBe(true);
  });

  it("resets a password when either provided reset OTP verifies", async () => {
    const customer = Object.assign(new Customer(), {
      id: customerId,
      status: CustomerStatus.ACTIVE,
      emailHash: "hash:ada@example.com",
      passwordHash: await hashPasswordForTest("SecureP@ss1"),
    });
    customers.findOneBy.mockResolvedValue(customer);
    phoneOtp.verifyPasswordResetPhone.mockResolvedValueOnce("INVALID");

    const result = await service.resetPassword({
      identifier: "ada@example.com",
      phoneCode: "000000",
      emailCode: "193847",
      newPassword: "BetterP@ss1",
    });

    expect(result).toEqual({ passwordChanged: true });
    expect(phoneOtp.verifyPasswordResetPhone).toHaveBeenCalledWith(customerId, "000000");
    expect(phoneOtp.verifyPasswordResetEmail).toHaveBeenCalledWith(customerId, "193847");
    expect(phoneOtp.revokePasswordReset).toHaveBeenCalledWith(customerId);
    expect(await verifyPassword("BetterP@ss1", customer.passwordHash)).toBe(true);
  });

  it("resends a phone verification code and invalidates the previous code first", async () => {
    const customer = Object.assign(new Customer(), {
      id: customerId,
      name: "Ada Okafor",
      status: CustomerStatus.UNVERIFIED,
      phoneHash: "hash:2348031234567",
      phoneEncrypted: "encrypted:2348031234567",
      phoneVerifiedAt: null,
    });
    customers.findOneBy.mockResolvedValue(customer);

    const result = await service.resendVerificationCode({
      channel: "phone",
      phone: "08031234567",
    });

    expect(result).toEqual({ sent: true, channel: "phone", otpExpiresInSeconds: 600 });
    expect(phoneOtp.revoke).toHaveBeenCalledWith(customerId);
    expect(phoneOtp.storeRegistrationPhone).toHaveBeenCalledWith(customerId, "482901");
    expect(phoneOtp.revoke.mock.invocationCallOrder[0]!).toBeLessThan(
      phoneOtp.storeRegistrationPhone.mock.invocationCallOrder[0]!,
    );
    expect(smsSender.sendPhoneVerification).toHaveBeenCalledWith({
      phone: "2348031234567",
      code: "482901",
      expiresInMinutes: 10,
    });
  });

  it("resends an email verification code and invalidates the previous code first", async () => {
    const customer = Object.assign(new Customer(), {
      id: customerId,
      name: "Ada Okafor",
      status: CustomerStatus.UNVERIFIED,
      emailHash: "hash:ada@example.com",
      emailEncrypted: "encrypted:ada@example.com",
      emailVerifiedAt: null,
    });
    customers.findOneBy.mockResolvedValue(customer);

    const result = await service.resendVerificationCode({
      channel: "email",
      email: "ADA@EXAMPLE.COM",
    });

    expect(result).toEqual({ sent: true, channel: "email", otpExpiresInSeconds: 600 });
    expect(phoneOtp.revokeEmail).toHaveBeenCalledWith(customerId);
    expect(phoneOtp.storeRegistrationEmail).toHaveBeenCalledWith(customerId, "482901");
    expect(phoneOtp.revokeEmail.mock.invocationCallOrder[0]!).toBeLessThan(
      phoneOtp.storeRegistrationEmail.mock.invocationCallOrder[0]!,
    );
    expect(emailSender.sendWelcomeVerification).toHaveBeenCalledWith({
      email: "ada@example.com",
      name: "Ada Okafor",
      code: "482901",
      expiresInMinutes: 10,
    });
  });

  it("creates an outlet admin for an existing outlet", async () => {
    const result = await service.createAdmin({
      name: "Outlet Manager",
      email: "MANAGER@EXAMPLE.COM",
      phone: "08031234567",
      outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
    });

    const saved = customers.save.mock.calls.at(-1)?.[0] as Customer | undefined;

    expect(outlets.findOneBy).toHaveBeenCalledWith({
      id: "4273e96c-2887-49a5-a6d5-269f007f04f0",
    });
    expect(customers.findOne).toHaveBeenCalledWith({
      where: { emailHash: "hash:manager@example.com" },
      withDeleted: true,
    });
    expect(saved).toMatchObject({
      name: "Outlet Manager",
      emailHash: "hash:manager@example.com",
      phoneHash: "hash:2348031234567",
      status: CustomerStatus.ACTIVE,
      role: UserRole.ADMIN,
      outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
    });
    expect(saved?.passwordHash).not.toBeUndefined();
    expect(await verifyPassword(result.temporaryPassword, saved!.passwordHash)).toBe(true);
    expect(result).toMatchObject({
      id: customerId,
      name: "Outlet Manager",
      role: UserRole.ADMIN,
      outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
    });
    expect(result.temporaryPassword).toHaveLength(19);
    expect(emailSender.sendTemporaryPassword).toHaveBeenCalledWith({
      email: "manager@example.com",
      name: "Outlet Manager",
      role: "outlet admin",
      temporaryPassword: result.temporaryPassword,
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

    const result = await service.verifyUser({
      code: "482901",
    });

    expect(phoneOtp.verifyRegistrationCode).toHaveBeenCalledWith("482901");
    const savedCustomer = customers.save.mock.calls.at(-1)?.[0] as Customer | undefined;

    expect(savedCustomer?.status).toBe(CustomerStatus.ACTIVE);
    expect(savedCustomer?.phoneVerifiedAt).toBeInstanceOf(Date);
    expect(result.status).toBe(CustomerStatus.ACTIVE);
    expect(result.channel).toBe("phone");
    expect(result.verifiedAt).toBeTypeOf("string");
    expect(result.verificationChannels).toEqual({ email: false, phone: true });
  });

  it("activates the account after a correct email OTP", async () => {
    const customer = Object.assign(new Customer(), {
      id: customerId,
      status: CustomerStatus.UNVERIFIED,
      phoneVerifiedAt: null,
      emailVerifiedAt: null,
    });
    customers.findOneBy.mockResolvedValue(customer);
    phoneOtp.verifyRegistrationCode.mockResolvedValueOnce({
      result: "VERIFIED",
      customerId,
      channel: "email",
    });

    const result = await service.verifyUser({
      code: "193847",
    });

    expect(phoneOtp.verifyRegistrationCode).toHaveBeenCalledWith("193847");
    const savedCustomer = customers.save.mock.calls.at(-1)?.[0] as Customer | undefined;

    expect(savedCustomer?.status).toBe(CustomerStatus.ACTIVE);
    expect(savedCustomer?.emailVerifiedAt).toBeInstanceOf(Date);
    expect(result.status).toBe(CustomerStatus.ACTIVE);
    expect(result.channel).toBe("email");
    expect(result.verifiedAt).toBeTypeOf("string");
    expect(result.verificationChannels).toEqual({ email: true, phone: false });
  });

  it("allows phone verification after email activation", async () => {
    const customer = Object.assign(new Customer(), {
      id: customerId,
      status: CustomerStatus.ACTIVE,
      phoneVerifiedAt: null,
      emailVerifiedAt: new Date("2026-06-23T10:00:00.000Z"),
    });
    customers.findOneBy.mockResolvedValue(customer);

    const result = await service.verifyUser({
      code: "482901",
    });

    expect(phoneOtp.verifyRegistrationCode).toHaveBeenCalledWith("482901");
    const savedCustomer = customers.save.mock.calls.at(-1)?.[0] as Customer | undefined;

    expect(savedCustomer?.status).toBe(CustomerStatus.ACTIVE);
    expect(savedCustomer?.phoneVerifiedAt).toBeInstanceOf(Date);
    expect(result.status).toBe(CustomerStatus.ACTIVE);
    expect(result.channel).toBe("phone");
    expect(result.verificationChannels).toEqual({ email: true, phone: true });
  });

  it.each(["INVALID", "EXPIRED"] as const)("rejects an %s OTP", async (result) => {
    customers.findOneBy.mockResolvedValue(
      Object.assign(new Customer(), {
        id: customerId,
        status: CustomerStatus.UNVERIFIED,
      }),
    );
    phoneOtp.verifyRegistrationCode.mockResolvedValue({ result });

    await expect(service.verifyUser({ code: "000000" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(customers.save).not.toHaveBeenCalled();
  });
});
