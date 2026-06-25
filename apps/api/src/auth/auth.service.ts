import { scryptSync, randomBytes } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { QueryFailedError } from "typeorm";

import { PiiCryptoService } from "../common/security/pii-crypto.service";
import { Customer } from "./customer.entity";
import { CustomerStatus } from "./customer-status.enum";
import type { RegisterCustomerDto } from "./dto/register-customer.dto";
import type { VerificationChannel, VerifyUserDto } from "./dto/verify-user.dto";
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

  async verifyUser(input: VerifyUserDto): Promise<UserVerificationResult> {
    const customer =
      input.channel === "phone"
        ? await this.findCustomerByPhone(input.phone)
        : await this.findCustomerByEmail(input.email);

    if (!customer || customer.status === CustomerStatus.SUSPENDED) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    const verification =
      input.channel === "phone"
        ? await this.phoneOtp.verify(customer.id, input.code)
        : await this.phoneOtp.verifyEmail(customer.id, input.code);

    if (verification !== "VERIFIED") {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    const verifiedAt = new Date();
    customer.status = CustomerStatus.ACTIVE;
    if (input.channel === "phone") {
      customer.phoneVerifiedAt = verifiedAt;
    } else {
      customer.emailVerifiedAt = verifiedAt;
    }
    const savedCustomer = await this.customers.save(customer);

    return {
      customerId: savedCustomer.id,
      status: CustomerStatus.ACTIVE,
      channel: input.channel,
      verifiedAt: verifiedAt.toISOString(),
      verificationChannels: this.verificationChannels(savedCustomer),
    };
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
