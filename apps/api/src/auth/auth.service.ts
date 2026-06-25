import { scryptSync, randomBytes } from "node:crypto";

import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { QueryFailedError } from "typeorm";

import { PiiCryptoService } from "../common/security/pii-crypto.service";
import { Customer } from "./customer.entity";
import { CustomerStatus } from "./customer-status.enum";
import type { RegisterCustomerDto } from "./dto/register-customer.dto";
import type { VerifyEmailDto } from "./dto/verify-email.dto";
import type { VerifyPhoneDto } from "./dto/verify-phone.dto";
import { EMAIL_SENDER, type EmailSender } from "./email/email-sender";
import { OTP_TTL_SECONDS } from "./otp/otp.constants";
import { PhoneOtpService } from "./otp/phone-otp.service";
import { normalizeNigerianPhoneNumber } from "./phone-number";
import { SMS_SENDER, type SmsSender } from "./sms/sms-sender";

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export interface RegistrationResult {
  customerId: string;
  status: CustomerStatus.UNVERIFIED;
  otpExpiresInSeconds: number;
  verificationChannels: {
    email: boolean;
    phone: boolean;
  };
}

export interface PhoneVerificationResult {
  customerId: string;
  status: CustomerStatus.ACTIVE;
  phoneVerifiedAt: string;
  verificationChannels: {
    email: boolean;
    phone: boolean;
  };
}

export interface EmailVerificationResult {
  customerId: string;
  status: CustomerStatus;
  emailVerifiedAt: string;
  verificationChannels: {
    email: boolean;
    phone: boolean;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    private readonly piiCrypto: PiiCryptoService,
    private readonly phoneOtp: PhoneOtpService,
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
          passwordHash: hashPassword(input.password),
          status: CustomerStatus.UNVERIFIED,
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
    const phoneCode = this.phoneOtp.generateCode();
    const emailCode = this.phoneOtp.generateCode();

    await this.phoneOtp.store(savedCustomer.id, phoneCode);
    await this.phoneOtp.storeEmail(savedCustomer.id, emailCode);

    try {
      await Promise.all([
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
    } catch (error) {
      await this.phoneOtp.revoke(savedCustomer.id);
      await this.phoneOtp.revokeEmail(savedCustomer.id);
      throw error;
    }

    return {
      customerId: savedCustomer.id,
      status: CustomerStatus.UNVERIFIED,
      otpExpiresInSeconds: OTP_TTL_SECONDS,
      verificationChannels: this.verificationChannels(savedCustomer),
    };
  }

  async verifyPhone(input: VerifyPhoneDto): Promise<PhoneVerificationResult> {
    const phone = normalizeNigerianPhoneNumber(input.phone);
    const phoneHash = this.piiCrypto.searchHash(phone);
    const customer = await this.customers.findOneBy({ phoneHash });

    if (!customer || customer.status !== CustomerStatus.UNVERIFIED) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    const verification = await this.phoneOtp.verify(customer.id, input.code);

    if (verification !== "VERIFIED") {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    customer.status = CustomerStatus.ACTIVE;
    customer.phoneVerifiedAt = new Date();
    const savedCustomer = await this.customers.save(customer);

    return {
      customerId: savedCustomer.id,
      status: CustomerStatus.ACTIVE,
      phoneVerifiedAt: savedCustomer.phoneVerifiedAt!.toISOString(),
      verificationChannels: this.verificationChannels(savedCustomer),
    };
  }

  async verifyEmail(input: VerifyEmailDto): Promise<EmailVerificationResult> {
    const email = input.email.trim().toLowerCase();
    const emailHash = this.piiCrypto.searchHash(email);
    const customer = await this.customers.findOneBy({ emailHash });

    if (!customer || customer.status === CustomerStatus.SUSPENDED) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    const verification = await this.phoneOtp.verifyEmail(customer.id, input.code);

    if (verification !== "VERIFIED") {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    customer.emailVerifiedAt = new Date();
    const savedCustomer = await this.customers.save(customer);

    return {
      customerId: savedCustomer.id,
      status: savedCustomer.status,
      emailVerifiedAt: savedCustomer.emailVerifiedAt!.toISOString(),
      verificationChannels: this.verificationChannels(savedCustomer),
    };
  }

  private verificationChannels(customer: Customer): { email: boolean; phone: boolean } {
    return {
      email: Boolean(customer.emailVerifiedAt),
      phone: Boolean(customer.phoneVerifiedAt),
    };
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
}
