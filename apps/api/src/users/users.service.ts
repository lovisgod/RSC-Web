import { randomBytes } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Customer } from "../auth/customer.entity";
import { CustomerStatus } from "../auth/customer-status.enum";
import { EMAIL_SENDER, type EmailSender } from "../auth/email/email-sender";
import { OTP_TTL_SECONDS } from "../auth/otp/otp.constants";
import { PhoneOtpService } from "../auth/otp/phone-otp.service";
import { hashPassword } from "../auth/password";
import { normalizeNigerianPhoneNumber } from "../auth/phone-number";
import { SMS_SENDER, type SmsSender } from "../auth/sms/sms-sender";
import { UserRole } from "../auth/user-role.enum";
import { PiiCryptoService } from "../common/security/pii-crypto.service";
import { MediaService, type UploadedImageFile } from "../media/media.service";
import type { OutletAdminQueryDto } from "./dto/outlet-admin-query.dto";
import type { CreateRiderDto, UpdateRiderDto } from "./dto/rider.dto";
import type { UpdateProfileDto, VerifyProfileChangeDto } from "./dto/profile.dto";

export interface ProfileResult {
  id: string;
  name: string;
  role: UserRole;
  outletId: string | null;
  avatarUrl: string | null;
  email: string;
  phone: string;
  verificationChannels: { email: boolean; phone: boolean };
  pendingVerificationChannels: { email: boolean; phone: boolean };
}

export interface ProfileUpdateResult extends ProfileResult {
  otpExpiresInSeconds: number | null;
}

export interface RiderResult {
  id: string;
  name: string;
  role: UserRole.RIDER;
  outletId: string | null;
  vehicleType: string | null;
  plateNumber: string | null;
  riderStatus: string | null;
  temporaryPassword: string;
  temporaryPasswordEmailSent: boolean;
  temporaryPasswordEmailError: string | null;
}

export interface RiderAdminResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole.RIDER;
  outletId: string | null;
  vehicleType: string | null;
  plateNumber: string | null;
  riderStatus: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OutletAdminResult {
  id: string;
  name: string;
  role: UserRole.ADMIN;
  outletId: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly users: Repository<Customer>,
    private readonly piiCrypto: PiiCryptoService,
    private readonly phoneOtp: PhoneOtpService,
    @Inject(SMS_SENDER) private readonly smsSender: SmsSender,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    private readonly media: MediaService,
  ) {}

  async getProfile(user: AuthenticatedUser): Promise<ProfileResult> {
    return this.toProfile(await this.requireUser(user.id));
  }

  async updateProfile(
    user: AuthenticatedUser,
    input: UpdateProfileDto,
  ): Promise<ProfileUpdateResult> {
    const account = await this.requireUser(user.id);
    let otpSent = false;

    if (input.name !== undefined) {
      account.name = input.name;
    }

    if (input.phone !== undefined) {
      const phone = normalizeNigerianPhoneNumber(input.phone);
      const phoneHash = this.piiCrypto.searchHash(phone);

      if (phoneHash !== account.phoneHash) {
        await this.ensureIdentityAvailable(phoneHash, "phone");
        const code = this.phoneOtp.generateCode();

        account.pendingPhoneEncrypted = this.piiCrypto.encrypt(phone);
        account.pendingPhoneHash = phoneHash;
        await this.phoneOtp.revoke(account.id);
        await this.phoneOtp.storeProfileChangePhone(account.id, code);
        await this.smsSender.sendPhoneVerification({
          phone,
          code,
          expiresInMinutes: OTP_TTL_SECONDS / 60,
        });
        otpSent = true;
      }
    }

    if (input.email !== undefined) {
      const email = input.email.trim().toLowerCase();
      const emailHash = this.piiCrypto.searchHash(email);

      if (emailHash !== account.emailHash) {
        await this.ensureIdentityAvailable(emailHash, "email");
        const code = this.phoneOtp.generateCode();

        account.pendingEmailEncrypted = this.piiCrypto.encrypt(email);
        account.pendingEmailHash = emailHash;
        await this.phoneOtp.revokeEmail(account.id);
        await this.phoneOtp.storeProfileChangeEmail(account.id, code);
        await this.emailSender.sendWelcomeVerification({
          email,
          name: account.name,
          code,
          expiresInMinutes: OTP_TTL_SECONDS / 60,
        });
        otpSent = true;
      }
    }

    const saved = await this.saveUser(account);

    return {
      ...this.toProfile(saved),
      otpExpiresInSeconds: otpSent ? OTP_TTL_SECONDS : null,
    };
  }

  async verifyProfileChange(
    user: AuthenticatedUser,
    input: VerifyProfileChangeDto,
  ): Promise<ProfileResult> {
    const account = await this.requireUser(user.id);
    const verification = await this.phoneOtp.verifyProfileChangeCode(input.code);

    if (verification.result !== "VERIFIED" || verification.customerId !== account.id) {
      throw new UnauthorizedException("Invalid or expired verification code");
    }

    if (verification.channel === "phone") {
      if (!account.pendingPhoneEncrypted || !account.pendingPhoneHash) {
        throw new BadRequestException("No pending phone change");
      }

      account.phoneEncrypted = account.pendingPhoneEncrypted;
      account.phoneHash = account.pendingPhoneHash;
      account.phoneVerifiedAt = new Date();
      account.pendingPhoneEncrypted = null;
      account.pendingPhoneHash = null;
    } else {
      if (!account.pendingEmailEncrypted || !account.pendingEmailHash) {
        throw new BadRequestException("No pending email change");
      }

      account.emailEncrypted = account.pendingEmailEncrypted;
      account.emailHash = account.pendingEmailHash;
      account.emailVerifiedAt = new Date();
      account.pendingEmailEncrypted = null;
      account.pendingEmailHash = null;
    }

    return this.toProfile(await this.saveUser(account));
  }

  async uploadAvatar(user: AuthenticatedUser, file: UploadedImageFile): Promise<ProfileResult> {
    const account = await this.requireUser(user.id);
    const upload = await this.media.uploadImage({
      file,
      folder: "user-avatars",
      publicIdPrefix: account.id,
    });

    account.avatarUrl = upload.url;

    return this.toProfile(await this.saveUser(account));
  }

  async deactivateAccount(user: AuthenticatedUser): Promise<{ deactivated: true }> {
    const account = await this.requireUser(user.id);

    account.status = CustomerStatus.SUSPENDED;
    await this.users.save(account);
    await this.users.softRemove(account);

    return { deactivated: true };
  }

  async createRider(actor: AuthenticatedUser, input: CreateRiderDto): Promise<RiderResult> {
    if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only admins can add riders");
    }

    const outletId =
      actor.role === UserRole.ADMIN ? await this.requireAdminOutletId(actor.id) : null;
    const phone = normalizeNigerianPhoneNumber(input.phone);
    const email = input.email.trim().toLowerCase();
    const phoneHash = this.piiCrypto.searchHash(phone);
    const emailHash = this.piiCrypto.searchHash(email);

    const [phoneUser, emailUser] = await Promise.all([
      this.users.findOneBy({ phoneHash }),
      this.users.findOneBy({ emailHash }),
    ]);

    if (phoneUser || emailUser) {
      throw new ConflictException("An account already exists with that phone or email");
    }

    const now = new Date();
    const temporaryPassword = generateTemporaryPassword();
    const rider = this.users.create({
      name: input.name,
      phoneEncrypted: this.piiCrypto.encrypt(phone),
      phoneHash,
      emailEncrypted: this.piiCrypto.encrypt(email),
      emailHash,
      passwordHash: await hashPassword(temporaryPassword),
      status: CustomerStatus.ACTIVE,
      role: UserRole.RIDER,
      outletId,
      vehicleType: input.vehicleType ?? null,
      plateNumber: input.plateNumber ?? null,
      riderStatus: "AVAILABLE",
      phoneVerifiedAt: now,
      emailVerifiedAt: now,
    });

    const saved = await this.saveUser(rider);

    let temporaryPasswordEmailSent = true;
    let temporaryPasswordEmailError: string | null = null;

    try {
      await this.emailSender.sendTemporaryPassword({
        email,
        name: saved.name,
        role: "rider",
        temporaryPassword,
      });
    } catch (error) {
      temporaryPasswordEmailSent = false;
      temporaryPasswordEmailError =
        error instanceof Error ? error.message : "Unable to send temporary password email";
      this.logger.warn(
        `Rider account created but temporary password email failed: ${JSON.stringify({
          riderId: saved.id,
          email,
          error: temporaryPasswordEmailError,
        })}`,
      );
    }

    return {
      id: saved.id,
      name: saved.name,
      role: UserRole.RIDER,
      outletId: saved.outletId,
      vehicleType: saved.vehicleType,
      plateNumber: saved.plateNumber,
      riderStatus: saved.riderStatus,
      temporaryPassword,
      temporaryPasswordEmailSent,
      temporaryPasswordEmailError,
    };
  }

  async listRiders(actor: AuthenticatedUser, outletId?: string): Promise<RiderAdminResult[]> {
    let targetOutletId = outletId || null;

    if (actor.role === UserRole.ADMIN) {
      const adminOutletId = await this.requireAdminOutletId(actor.id);
      if (outletId && outletId !== adminOutletId) {
        throw new ForbiddenException("Outlet admins can only retrieve riders for their own outlet");
      }
      targetOutletId = adminOutletId;
    } else if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only admins can list riders");
    }

    const riders = await this.users.find({
      where: {
        role: UserRole.RIDER,
        ...(targetOutletId ? { outletId: targetOutletId } : {}),
      },
      order: { createdAt: "DESC" },
    });

    return riders.map((rider) => this.toRiderAdmin(rider));
  }

  async getRider(actor: AuthenticatedUser, id: string): Promise<RiderAdminResult> {
    const rider = await this.users.findOneBy({ id, role: UserRole.RIDER });

    if (!rider) {
      throw new BadRequestException("Rider not found");
    }

    if (actor.role === UserRole.ADMIN) {
      const adminOutletId = await this.requireAdminOutletId(actor.id);
      if (rider.outletId !== adminOutletId) {
        throw new ForbiddenException("Outlet admins can only retrieve riders for their own outlet");
      }
    } else if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only admins can retrieve riders");
    }

    return this.toRiderAdmin(rider);
  }

  async updateRider(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateRiderDto,
  ): Promise<RiderAdminResult> {
    const rider = await this.users.findOneBy({ id, role: UserRole.RIDER });

    if (!rider) {
      throw new BadRequestException("Rider not found");
    }

    if (actor.role === UserRole.ADMIN) {
      const adminOutletId = await this.requireAdminOutletId(actor.id);
      if (rider.outletId !== adminOutletId) {
        throw new ForbiddenException("Outlet admins can only update riders for their own outlet");
      }
    } else if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only admins can update riders");
    }

    if (input.name !== undefined) {
      rider.name = input.name;
    }

    if (input.phone !== undefined) {
      const phone = normalizeNigerianPhoneNumber(input.phone);
      const phoneHash = this.piiCrypto.searchHash(phone);

      if (phoneHash !== rider.phoneHash) {
        await this.ensureIdentityAvailable(phoneHash, "phone");
        rider.phoneEncrypted = this.piiCrypto.encrypt(phone);
        rider.phoneHash = phoneHash;
      }
    }

    if (input.email !== undefined) {
      const email = input.email.trim().toLowerCase();
      const emailHash = this.piiCrypto.searchHash(email);

      if (emailHash !== rider.emailHash) {
        await this.ensureIdentityAvailable(emailHash, "email");
        rider.emailEncrypted = this.piiCrypto.encrypt(email);
        rider.emailHash = emailHash;
      }
    }

    if (input.vehicleType !== undefined) {
      rider.vehicleType = input.vehicleType;
    }

    if (input.plateNumber !== undefined) {
      rider.plateNumber = input.plateNumber;
    }

    if (input.riderStatus !== undefined) {
      rider.riderStatus = input.riderStatus;
    }

    if (input.status !== undefined) {
      rider.status = input.status;
    }

    const saved = await this.saveUser(rider);
    return this.toRiderAdmin(saved);
  }

  async deleteRider(actor: AuthenticatedUser, id: string): Promise<{ deleted: true }> {
    const rider = await this.users.findOneBy({ id, role: UserRole.RIDER });

    if (!rider) {
      throw new BadRequestException("Rider not found");
    }

    if (actor.role === UserRole.ADMIN) {
      const adminOutletId = await this.requireAdminOutletId(actor.id);
      if (rider.outletId !== adminOutletId) {
        throw new ForbiddenException("Outlet admins can only delete riders for their own outlet");
      }
    } else if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only admins can delete riders");
    }

    await this.users.softRemove(rider);
    return { deleted: true };
  }

  private toRiderAdmin(user: Customer): RiderAdminResult {
    return {
      id: user.id,
      name: user.name,
      role: UserRole.RIDER,
      outletId: user.outletId,
      email: this.piiCrypto.decrypt(user.emailEncrypted),
      phone: this.piiCrypto.decrypt(user.phoneEncrypted),
      vehicleType: user.vehicleType,
      plateNumber: user.plateNumber,
      riderStatus: user.riderStatus,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async listOutletAdmins(
    actor: AuthenticatedUser,
    query: OutletAdminQueryDto = {},
  ): Promise<OutletAdminResult[]> {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only super admins can list outlet admins");
    }

    const admins = await this.users.find({
      where: {
        role: UserRole.ADMIN,
        ...(query.outletId ? { outletId: query.outletId } : {}),
      },
      order: { createdAt: "DESC" },
    });

    return admins.map((admin) => this.toOutletAdmin(admin));
  }

  async deleteOutletAdmin(actor: AuthenticatedUser, id: string): Promise<{ deleted: true }> {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only super admins can delete outlet admins");
    }

    if (actor.id === id) {
      throw new BadRequestException("Super admin cannot delete their own account");
    }

    const admin = await this.users.findOneBy({ id, role: UserRole.ADMIN });

    if (!admin) {
      throw new BadRequestException("Outlet admin not found");
    }

    await this.users.softRemove(admin);

    return { deleted: true };
  }

  async deleteUser(actor: AuthenticatedUser, id: string): Promise<{ deleted: true }> {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only super admins can delete users");
    }

    if (actor.id === id) {
      throw new BadRequestException("Super admin cannot delete their own account");
    }

    const user = await this.users.findOneBy({ id });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    await this.users.softRemove(user);

    return { deleted: true };
  }

  private async requireUser(id: string): Promise<Customer> {
    const user = await this.users.findOneBy({ id });

    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    return user;
  }

  private async requireAdminOutletId(id: string): Promise<string> {
    const admin = await this.users.findOne({
      where: { id, role: UserRole.ADMIN },
      select: { id: true, outletId: true },
    });

    if (!admin?.outletId) {
      throw new ForbiddenException("Outlet admin is not linked to an outlet");
    }

    return admin.outletId;
  }

  private async ensureIdentityAvailable(hash: string, channel: "phone" | "email"): Promise<void> {
    const existing =
      channel === "phone"
        ? await this.users.findOneBy({ phoneHash: hash })
        : await this.users.findOneBy({ emailHash: hash });

    if (existing) {
      throw new ConflictException("An account already exists with that phone or email");
    }
  }

  private async saveUser(user: Customer): Promise<Customer> {
    try {
      return await this.users.save(user);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException("An account already exists with that phone or email");
      }

      throw error;
    }
  }

  private toProfile(user: Customer): ProfileResult {
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      outletId: user.outletId,
      avatarUrl: user.avatarUrl,
      email: this.piiCrypto.decrypt(user.emailEncrypted),
      phone: this.piiCrypto.decrypt(user.phoneEncrypted),
      verificationChannels: {
        email: Boolean(user.emailVerifiedAt),
        phone: Boolean(user.phoneVerifiedAt),
      },
      pendingVerificationChannels: {
        email: Boolean(user.pendingEmailHash),
        phone: Boolean(user.pendingPhoneHash),
      },
    };
  }

  private toOutletAdmin(user: Customer): OutletAdminResult {
    if (!user.outletId) {
      throw new BadRequestException("Outlet admin is not linked to an outlet");
    }

    return {
      id: user.id,
      name: user.name,
      role: UserRole.ADMIN,
      outletId: user.outletId,
      email: this.piiCrypto.decrypt(user.emailEncrypted),
      phone: this.piiCrypto.decrypt(user.phoneEncrypted),
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
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

function generateTemporaryPassword(): string {
  return `${randomBytes(12).toString("base64url")}Aa1`;
}
