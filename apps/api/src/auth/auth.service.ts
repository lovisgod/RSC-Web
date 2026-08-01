import { randomBytes } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { PiiCryptoService } from "../common/security/pii-crypto.service";
import { Outlet } from "../outlets/outlet.entity";
import { AuthSessionService, type IssuedSession } from "./auth-session.service";
import type { AuthenticatedUser } from "./authenticated-user";
import { Customer } from "./customer.entity";
import { CustomerStatus } from "./customer-status.enum";
import type { CreateAdminDto } from "./dto/create-admin.dto";
import type { LoginDto } from "./dto/login.dto";
import type { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from "./dto/password.dto";
import type { RegisterCustomerDto } from "./dto/register-customer.dto";
import type {
  ResendVerificationCodeDto,
  VerificationChannel,
  VerifyUserDto,
} from "./dto/verify-user.dto";
import { EMAIL_SENDER, type EmailSender } from "./email/email-sender";
import { OTP_TTL_SECONDS } from "./otp/otp.constants";
import { PhoneOtpService } from "./otp/phone-otp.service";
import { hashPassword, isBcryptHash, verifyPassword } from "./password";
import { normalizeNigerianPhoneNumber } from "./phone-number";
import { SMS_SENDER, type SmsSender } from "./sms/sms-sender";
import { UserRole } from "./user-role.enum";

export interface RegistrationResult {
  customerId: string;
  status: CustomerStatus.UNVERIFIED;
  otpExpiresInSeconds: number;
  verificationChannels: {
    email: boolean;
    phone: boolean;
  };
}

export interface UserVerificationResult {
  customerId: string;
  status: CustomerStatus.ACTIVE;
  channel: VerificationChannel;
  verifiedAt: string;
  verificationChannels: {
    email: boolean;
    phone: boolean;
  };
}

export interface ResendVerificationCodeResult {
  sent: true;
  channel: VerificationChannel;
  otpExpiresInSeconds: number;
}

export interface AdminResult {
  id: string;
  name: string;
  role: UserRole.ADMIN;
  outletId: string;
  temporaryPassword: string;
}

export interface PasswordResetDispatchResult {
  sent: true;
  otpExpiresInSeconds: number;
}

export interface PasswordChangeResult {
  passwordChanged: true;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(Outlet)
    private readonly outlets: Repository<Outlet>,
    private readonly piiCrypto: PiiCryptoService,
    private readonly phoneOtp: PhoneOtpService,
    private readonly sessions: AuthSessionService,
    @Inject(SMS_SENDER) private readonly smsSender: SmsSender,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  async register(input: RegisterCustomerDto): Promise<RegistrationResult> {
    const phone = normalizeNigerianPhoneNumber(input.phone);
    const email = input.email.trim().toLowerCase();
    const phoneHash = this.piiCrypto.searchHash(phone);
    const emailHash = this.piiCrypto.searchHash(email);

    const [phoneCustomer, emailCustomer] = await Promise.all([
      this.customers.findOneBy({ phoneHash }),
      this.customers.findOneBy({ emailHash }),
    ]);

    if (
      (phoneCustomer && phoneCustomer.status !== CustomerStatus.UNVERIFIED) ||
      (phoneCustomer && phoneCustomer.emailHash !== emailHash) ||
      (emailCustomer && emailCustomer.id !== phoneCustomer?.id)
    ) {
      throw new ConflictException("An account already exists with that phone or email");
    }

    const customer = phoneCustomer
      ? phoneCustomer
      : this.customers.create({
          name: input.name.trim(),
          phoneEncrypted: this.piiCrypto.encrypt(phone),
          phoneHash,
          emailEncrypted: this.piiCrypto.encrypt(email),
          emailHash,
          passwordHash: await hashPassword(input.password),
          status: CustomerStatus.UNVERIFIED,
          role: UserRole.CUSTOMER,
          phoneVerifiedAt: null,
          emailVerifiedAt: null,
        });

    let savedCustomer: Customer;

    try {
      savedCustomer = await this.customers.save(customer);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException("An account already exists with that phone or email");
      }

      throw error;
    }
    const { phoneCode, emailCode } = this.generateDistinctVerificationCodes();

    await this.phoneOtp.storeRegistrationPhone(savedCustomer.id, phoneCode);
    await this.phoneOtp.storeRegistrationEmail(savedCustomer.id, emailCode);

    const [smsResult, emailResult] = await Promise.allSettled([
      this.smsSender.sendPhoneVerification({
        phone,
        code: phoneCode,
        expiresInMinutes: OTP_TTL_SECONDS / 60,
      }),
      this.emailSender.sendWelcomeVerification({
        email,
        name: savedCustomer.name,
        code: emailCode,
        expiresInMinutes: OTP_TTL_SECONDS / 60,
      }),
    ]);

    if (emailResult.status === "rejected") {
      await this.phoneOtp.revoke(savedCustomer.id);
      await this.phoneOtp.revokeEmail(savedCustomer.id);
      throw emailResult.reason;
    }

    if (smsResult.status === "rejected") {
      this.logger.warn(
        `Phone verification SMS failed; continuing because email verification was sent: ${this.describeDispatchError(
          smsResult.reason,
        )}`,
      );
    }

    return {
      customerId: savedCustomer.id,
      status: CustomerStatus.UNVERIFIED,
      otpExpiresInSeconds: OTP_TTL_SECONDS,
      verificationChannels: this.verificationChannels(savedCustomer),
    };
  }

  async login(input: LoginDto): Promise<IssuedSession> {
    const customer = await this.findCustomerByIdentifier(input.identifier);

    if (!customer || customer.status !== CustomerStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid email, phone, or password");
    }

    const passwordMatches = await verifyPassword(input.password, customer.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email, phone, or password");
    }

    if (!isBcryptHash(customer.passwordHash)) {
      customer.passwordHash = await hashPassword(input.password);
      await this.customers.save(customer);
    }

    return this.sessions.issueSession(customer);
  }

  async createAdmin(input: CreateAdminDto): Promise<AdminResult> {
    const outlet = await this.outlets.findOneBy({ id: input.outletId });

    if (!outlet) {
      throw new BadRequestException("Outlet does not exist");
    }

    const phone = normalizeNigerianPhoneNumber(input.phone);
    const email = input.email.trim().toLowerCase();
    const phoneHash = this.piiCrypto.searchHash(phone);
    const emailHash = this.piiCrypto.searchHash(email);

    const [phoneCustomer, emailCustomer] = await Promise.all([
      this.customers.findOne({ where: { phoneHash }, withDeleted: true }),
      this.customers.findOne({ where: { emailHash }, withDeleted: true }),
    ]);

    if (phoneCustomer || emailCustomer) {
      throw new ConflictException("An account already exists with that phone or email");
    }

    const now = new Date();
    const temporaryPassword = generateTemporaryPassword();
    const admin = this.customers.create({
      name: input.name.trim(),
      phoneEncrypted: this.piiCrypto.encrypt(phone),
      phoneHash,
      emailEncrypted: this.piiCrypto.encrypt(email),
      emailHash,
      passwordHash: await hashPassword(temporaryPassword),
      status: CustomerStatus.ACTIVE,
      role: UserRole.ADMIN,
      outletId: outlet.id,
      phoneVerifiedAt: now,
      emailVerifiedAt: now,
    });

    try {
      const savedAdmin = await this.customers.save(admin);
      await this.emailSender.sendTemporaryPassword({
        email,
        name: savedAdmin.name,
        role: "outlet admin",
        temporaryPassword,
      });

      return {
        id: savedAdmin.id,
        name: savedAdmin.name,
        role: UserRole.ADMIN,
        outletId: savedAdmin.outletId!,
        temporaryPassword,
      };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException("An account already exists with that phone or email");
      }

      throw error;
    }
  }

  async verifyUser(input: Pick<VerifyUserDto, "code">): Promise<UserVerificationResult> {
    if (!(await this.phoneOtp.consumeRateLimit("verify-user", input.code, 10, 10 * 60))) {
      throw new HttpException(
        "Too many verification attempts. Try again later",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const verification = await this.phoneOtp.verifyRegistrationCode(input.code);
    if (verification.result !== "VERIFIED") {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    const customer = await this.customers.findOneBy({ id: verification.customerId });
    const channel = verification.channel;

    if (
      !customer ||
      customer.status === CustomerStatus.SUSPENDED ||
      (channel === "phone" && customer.phoneVerifiedAt) ||
      (channel === "email" && customer.emailVerifiedAt)
    ) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    const verifiedAt = new Date();
    customer.status = CustomerStatus.ACTIVE;
    if (channel === "phone") {
      customer.phoneVerifiedAt = verifiedAt;
    } else {
      customer.emailVerifiedAt = verifiedAt;
    }
    const savedCustomer = await this.customers.save(customer);

    return {
      customerId: savedCustomer.id,
      status: CustomerStatus.ACTIVE,
      channel,
      verifiedAt: verifiedAt.toISOString(),
      verificationChannels: this.verificationChannels(savedCustomer),
    };
  }

  async resendVerificationCode(
    input: ResendVerificationCodeDto,
  ): Promise<ResendVerificationCodeResult> {
    const identity =
      input.channel === "phone"
        ? normalizeNigerianPhoneNumber(input.phone ?? "")
        : (input.email ?? "").trim().toLowerCase();
    if (!(await this.phoneOtp.consumeRateLimit("resend-verification", identity, 5, 10 * 60))) {
      throw new HttpException(
        "Too many verification requests. Try again later",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const customer =
      input.channel === "phone"
        ? await this.findCustomerByPhone(input.phone)
        : await this.findCustomerByEmail(input.email);

    if (!customer || customer.status === CustomerStatus.SUSPENDED) {
      return {
        sent: true,
        channel: input.channel,
        otpExpiresInSeconds: OTP_TTL_SECONDS,
      };
    }

    if (
      (input.channel === "phone" && customer.phoneVerifiedAt) ||
      (input.channel === "email" && customer.emailVerifiedAt)
    ) {
      return {
        sent: true,
        channel: input.channel,
        otpExpiresInSeconds: OTP_TTL_SECONDS,
      };
    }

    const code = this.phoneOtp.generateCode();

    if (input.channel === "phone") {
      const phone = this.piiCrypto.decrypt(customer.phoneEncrypted);

      await this.phoneOtp.revoke(customer.id);
      await this.phoneOtp.storeRegistrationPhone(customer.id, code);

      try {
        await this.smsSender.sendPhoneVerification({
          phone,
          code,
          expiresInMinutes: OTP_TTL_SECONDS / 60,
        });
      } catch (error) {
        await this.phoneOtp.revoke(customer.id);
        throw error;
      }
    } else {
      const email = this.piiCrypto.decrypt(customer.emailEncrypted);

      await this.phoneOtp.revokeEmail(customer.id);
      await this.phoneOtp.storeRegistrationEmail(customer.id, code);

      try {
        await this.emailSender.sendWelcomeVerification({
          email,
          name: customer.name,
          code,
          expiresInMinutes: OTP_TTL_SECONDS / 60,
        });
      } catch (error) {
        await this.phoneOtp.revokeEmail(customer.id);
        throw error;
      }
    }

    return {
      sent: true,
      channel: input.channel,
      otpExpiresInSeconds: OTP_TTL_SECONDS,
    };
  }

  async changePassword(
    user: AuthenticatedUser,
    input: ChangePasswordDto,
  ): Promise<PasswordChangeResult> {
    const customer = await this.customers.findOneBy({ id: user.id });

    if (!customer) {
      throw new UnauthorizedException("Authentication required");
    }

    const passwordMatches = await verifyPassword(input.currentPassword, customer.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    customer.passwordHash = await hashPassword(input.newPassword);
    await this.customers.save(customer);

    return { passwordChanged: true };
  }

  async forgotPassword(input: ForgotPasswordDto): Promise<PasswordResetDispatchResult> {
    const customer = await this.findCustomerByIdentifier(input.identifier);

    if (!customer || customer.status !== CustomerStatus.ACTIVE) {
      return { sent: true, otpExpiresInSeconds: OTP_TTL_SECONDS };
    }

    const phoneCode = this.phoneOtp.generateCode();
    const emailCode = this.phoneOtp.generateCode();
    const phone = this.piiCrypto.decrypt(customer.phoneEncrypted);
    const email = this.piiCrypto.decrypt(customer.emailEncrypted);

    await Promise.all([
      this.phoneOtp.storePasswordResetPhone(customer.id, phoneCode),
      this.phoneOtp.storePasswordResetEmail(customer.id, emailCode),
    ]);

    const [smsResult, emailResult] = await Promise.allSettled([
      this.smsSender.sendPasswordReset({
        phone,
        code: phoneCode,
        expiresInMinutes: OTP_TTL_SECONDS / 60,
      }),
      this.emailSender.sendPasswordReset({
        email,
        name: customer.name,
        code: emailCode,
        expiresInMinutes: OTP_TTL_SECONDS / 60,
      }),
    ]);

    if (emailResult.status === "rejected") {
      await this.phoneOtp.revokePasswordReset(customer.id);
      throw emailResult.reason;
    }

    if (smsResult.status === "rejected") {
      this.logger.warn(
        `Password reset SMS failed; continuing because email reset was sent: ${this.describeDispatchError(
          smsResult.reason,
        )}`,
      );
    }

    return { sent: true, otpExpiresInSeconds: OTP_TTL_SECONDS };
  }

  async resetPassword(input: ResetPasswordDto): Promise<PasswordChangeResult> {
    const customer = await this.findCustomerByIdentifier(input.identifier);

    if (!customer || customer.status !== CustomerStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid or expired password reset code");
    }

    if (!input.phoneCode && !input.emailCode) {
      throw new BadRequestException("Either phoneCode or emailCode is required");
    }

    const verifications = await Promise.all([
      input.phoneCode
        ? this.phoneOtp.verifyPasswordResetPhone(customer.id, input.phoneCode)
        : Promise.resolve("EXPIRED"),
      input.emailCode
        ? this.phoneOtp.verifyPasswordResetEmail(customer.id, input.emailCode)
        : Promise.resolve("EXPIRED"),
    ]);

    if (!verifications.includes("VERIFIED")) {
      await this.phoneOtp.revokePasswordReset(customer.id);
      throw new UnauthorizedException("Invalid or expired password reset code");
    }

    customer.passwordHash = await hashPassword(input.newPassword);
    await this.customers.save(customer);
    await this.phoneOtp.revokePasswordReset(customer.id);

    return { passwordChanged: true };
  }

  private async findCustomerByPhone(phone: string | undefined): Promise<Customer | null> {
    if (!phone) {
      throw new BadRequestException("Phone is required when channel is phone");
    }

    const normalizedPhone = normalizeNigerianPhoneNumber(phone);
    const phoneHash = this.piiCrypto.searchHash(normalizedPhone);

    return this.customers.findOneBy({ phoneHash });
  }

  private async findCustomerByEmail(email: string | undefined): Promise<Customer | null> {
    if (!email) {
      throw new BadRequestException("Email is required when channel is email");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailHash = this.piiCrypto.searchHash(normalizedEmail);

    return this.customers.findOneBy({ emailHash });
  }

  private async findCustomerByIdentifier(identifier: string): Promise<Customer | null> {
    if (identifier.includes("@")) {
      return this.findCustomerByEmail(identifier);
    }

    return this.findCustomerByPhone(identifier);
  }

  private verificationChannels(customer: Customer): { email: boolean; phone: boolean } {
    return {
      email: Boolean(customer.emailVerifiedAt),
      phone: Boolean(customer.phoneVerifiedAt),
    };
  }

  private generateDistinctVerificationCodes(): { phoneCode: string; emailCode: string } {
    const phoneCode = this.phoneOtp.generateCode();
    let emailCode = this.phoneOtp.generateCode();

    while (emailCode === phoneCode) {
      emailCode = this.phoneOtp.generateCode();
    }

    return { phoneCode, emailCode };
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError: unknown = error.driverError;

    return (
      typeof driverError === "object" &&
      driverError !== null &&
      "code" in driverError &&
      driverError.code === "23505"
    );
  }

  private describeDispatchError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return "Unknown error";
  }
}

function generateTemporaryPassword(): string {
  return `${randomBytes(12).toString("base64url")}Aa1`;
}
