import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";

import { PAYMENT_ADAPTER, type PaymentAdapter } from "../payments/payment-adapter";
import { Outlet } from "./outlet.entity";
import { Customer } from "../auth/customer.entity";
import { UserRole } from "../auth/user-role.enum";
import type { ApplicationConfig } from "../config/configuration";

export interface ProvisionOutletSubaccountInput {
  businessName: string;
  bankCode: string;
  accountNumber: string;
}

@Injectable()
export class OutletsService {
  private readonly logger = new Logger(OutletsService.name);

  constructor(
    @InjectRepository(Outlet) private readonly outlets: Repository<Outlet>,
    @InjectRepository(Customer) private readonly users: Repository<Customer>,
    @Inject(PAYMENT_ADAPTER) private readonly paymentAdapter: PaymentAdapter,
    private readonly configService: ConfigService<ApplicationConfig, true>,
  ) {}

  async checkOwnOutletAccess(userId: string, role: UserRole, outletId: string): Promise<void> {
    if (role !== UserRole.ADMIN) {
      return;
    }
    const admin = await this.users.findOne({
      where: { id: userId, role: UserRole.ADMIN },
      select: { id: true, outletId: true },
    });
    if (!admin || admin.outletId !== outletId) {
      throw new ForbiddenException("Cannot manage another outlet's subaccount");
    }
  }

  // ---------------------------------------------------------------------------
  // Public catalog
  // ---------------------------------------------------------------------------

  async findAll(): Promise<Outlet[]> {
    return this.outlets.find({ order: { name: "ASC" } });
  }

  async findOne(id: string): Promise<Outlet> {
    const outlet = await this.outlets.findOneBy({ id });

    if (!outlet) {
      throw new NotFoundException("Outlet not found");
    }

    return outlet;
  }

  // ---------------------------------------------------------------------------
  // Subaccount provisioning
  // ---------------------------------------------------------------------------

  /**
   * Register the outlet's bank account with the payment provider and store
   * the returned subaccount code on the outlet record.
   *
   * Idempotent — if the outlet already has a subaccount code this returns early
   * unless force=true is passed.
   */
  async provisionSubaccount(
    outletId: string,
    input: ProvisionOutletSubaccountInput,
    force = false,
  ): Promise<{ subaccountCode: string; outlet: Outlet }> {
    const outlet = await this.outlets.findOneBy({ id: outletId });

    if (!outlet) {
      throw new NotFoundException("Outlet not found");
    }

    if (outlet.settlementSubaccountCode && !force) {
      return { subaccountCode: outlet.settlementSubaccountCode, outlet };
    }

    // Actual per-transaction commission is deducted via split logic; provider-level
    // subaccount defaults are kept at 0 so the platform split remains source of truth.
    const commissionPct = 0; // Platform keeps remainder via split_code bearer_type=account

    const result = await this.paymentAdapter.provisionSubaccount({
      businessName: input.businessName,
      bankCode: input.bankCode,
      accountNumber: input.accountNumber,
      percentageCharge: commissionPct,
    });

    await this.ensureUniqueSettlementSubaccountCode(result.subaccountCode, outlet.id);

    outlet.settlementSubaccountCode = result.subaccountCode;
    await this.outlets.save(outlet);

    this.logger.log(
      `Outlet ${outletId} (${outlet.name}) provisioned with subaccount ${result.subaccountCode}`,
    );

    return { subaccountCode: result.subaccountCode, outlet };
  }

  /** Manually set a settlement subaccount code that was registered externally. */
  async setSubaccountCode(
    outletId: string,
    subaccountCode: string,
  ): Promise<{ subaccountCode: string; outlet: Outlet }> {
    const outlet = await this.outlets.findOneBy({ id: outletId });

    if (!outlet) {
      throw new NotFoundException("Outlet not found");
    }

    const normalizedSubaccountCode = subaccountCode.trim();
    if (/\s/.test(normalizedSubaccountCode)) {
      throw new BadRequestException("Settlement subaccount code must not contain spaces");
    }

    const paymentsConfig = this.configService.get("payments", { infer: true });

    if (paymentsConfig.provider === "paystack") {
      if (!normalizedSubaccountCode.startsWith("ACCT_")) {
        throw new BadRequestException(
          "Invalid subaccount code format — Paystack codes must start with ACCT_",
        );
      }
    } else {
      if (normalizedSubaccountCode.length < 2) {
        throw new BadRequestException(
          "Subaccount code must be longer than or equal to 2 characters",
        );
      }
    }

    await this.ensureUniqueSettlementSubaccountCode(normalizedSubaccountCode, outlet.id);

    outlet.settlementSubaccountCode = normalizedSubaccountCode;
    await this.outlets.save(outlet);

    return { subaccountCode: normalizedSubaccountCode, outlet };
  }

  private async ensureUniqueSettlementSubaccountCode(
    settlementSubaccountCode: string,
    outletId: string,
  ): Promise<void> {
    const existing = await this.outlets.findOne({ where: { settlementSubaccountCode } });

    if (existing && existing.id !== outletId) {
      throw new ConflictException("Settlement subaccount code already belongs to another outlet");
    }
  }
}
