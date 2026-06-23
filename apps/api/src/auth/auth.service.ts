import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { QueryFailedError } from "typeorm";

import { PiiCryptoService } from "../common/security/pii-crypto.service";
import { Customer } from "./customer.entity";
import { CustomerStatus } from "./customer-status.enum";
import type { RegisterCustomerDto } from "./dto/register-customer.dto";
import type { VerifyPhoneDto } from "./dto/verify-phone.dto";
import { OTP_TTL_SECONDS } from "./otp/otp.constants";
import { PhoneOtpService } from "./otp/phone-otp.service";
import { normalizeNigerianPhoneNumber } from "./phone-number";
import { SMS_SENDER, type SmsSender } from "./sms/sms-sender";

export interface RegistrationResult {
  customerId: string;
  status: CustomerStatus;
  otpExpiresInSeconds: number;
}

export interface PhoneVerificationResult {
  customerId: string;
  status: CustomerStatus;
  phoneVerifiedAt: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    private readonly piiCrypto: PiiCryptoService,
    private readonly phoneOtp: PhoneOtpService,
    @Inject(SMS_SENDER) private readonly smsSender: SmsSender,
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
          status: CustomerStatus.UNVERIFIED,
          phoneVerifiedAt: null,
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
    const code = this.phoneOtp.generateCode();

    await this.phoneOtp.store(savedCustomer.id, code);

    try {
      await this.smsSender.sendPhoneVerification({
        phone,
        code,
        expiresInMinutes: OTP_TTL_SECONDS / 60,
      });
    } catch (error) {
      await this.phoneOtp.revoke(savedCustomer.id);
      throw error;
    }

    return {
      customerId: savedCustomer.id,
      status: savedCustomer.status,
      otpExpiresInSeconds: OTP_TTL_SECONDS,
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
      status: savedCustomer.status,
      phoneVerifiedAt: savedCustomer.phoneVerifiedAt!.toISOString(),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      typeof error.driverError === "object" &&
      error.driverError !== null &&
      "code" in error.driverError &&
      error.driverError.code === "23505"
    );
  }
}
