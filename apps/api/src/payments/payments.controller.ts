import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { InitiatePaymentDto } from "./dto/payment.dto";
import { UpdatePlatformChargesDto } from "./dto/platform-charges.dto";
import { PaymentsService } from "./payments.service";
import { PAYMENT_ADAPTER, type PaymentAdapter } from "./payment-adapter";
import { Inject, Logger } from "@nestjs/common";

@ApiTags("Payments")
@Controller({ path: "payments", version: "1" })
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly payments: PaymentsService,
    @Inject(PAYMENT_ADAPTER) private readonly paymentAdapter: PaymentAdapter,
  ) {}

  @Get("platform-charges")
  @ApiMessage("Platform charges retrieved")
  platformCharges() {
    return this.payments.getPlatformCharges();
  }

  @Get("banks")
  @ApiMessage("Nigerian banks retrieved")
  banks() {
    return this.payments.getBanks();
  }

  @Get("resolve-account")
  @ApiMessage("Bank account resolved")
  resolveAccount(
    @Query("accountNumber") accountNumber: string,
    @Query("bankCode") bankCode: string,
  ) {
    return this.payments.resolveBankAccount(accountNumber, bankCode);
  }

  @Patch("platform-charges")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Platform charges updated")
  updatePlatformCharges(@Body() input: UpdatePlatformChargesDto) {
    return this.payments.updatePlatformCharges(input);
  }

  @Post("initiate")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Payment initiated successfully")
  initiate(@Req() request: AuthenticatedRequest, @Body() input: InitiatePaymentDto) {
    return this.payments.initiate(request.user!, input);
  }

  /**
   * Paystack webhook receiver.
   * This endpoint is PUBLIC — authentication is handled by HMAC-SHA512 signature validation.
   * NestJS must be configured to preserve the raw request body for signature verification
   * (see bootstrap.ts — rawBody: true on app.useBodyParser or NestFactory.create options).
   */
  @Post("webhook")
  @HttpCode(200)
  @ApiOperation({
    summary: "Payment provider webhook receiver (Paystack)",
    description:
      "Receives charge.success / charge.failed events from Paystack. " +
      "Validates HMAC-SHA512 signature. No auth cookie required.",
  })
  async webhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers("x-paystack-signature") signature: string,
  ) {
    const rawBody = (request as unknown as { rawBody?: Buffer }).rawBody;

    if (!rawBody) {
      this.logger.warn("Webhook received without rawBody — check rawBody: true in NestFactory");
      return { received: false };
    }

    const event = await this.paymentAdapter.parseWebhookEvent(rawBody, signature ?? "");

    if (!event) {
      // Invalid signature or unrecognised event type — return 200 to stop Paystack retries
      return { received: false };
    }

    const result = await this.payments.confirmPayment(event);
    return { received: true, already: result.already };
  }

  /**
   * Frontend polling fallback when webhook delivery is delayed.
   * Authenticated — customers can only verify their own payments.
   */
  @Get("verify/:reference")
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Payment status retrieved")
  verify(@Req() request: AuthenticatedRequest, @Param("reference") reference: string) {
    return this.payments.verifyPayment(request.user!, reference);
  }
}
