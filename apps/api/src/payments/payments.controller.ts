import {
  Body,
  Controller,
  Get,
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
import type { Request } from "express";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { RateLimit, SkipRateLimit } from "../common/rate-limit/rate-limit.decorator";
import {
  InitiatePaymentDto,
  ListRefundRequestsQueryDto,
  ProcessRefundDto,
  RequestRefundDto,
  RetryPaymentDto,
} from "./dto/payment.dto";
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
  @RateLimit({ limit: 30, windowSeconds: 60 })
  @ApiMessage("Bank account resolved")
  resolveAccount(
    @Query("accountNumber") accountNumber: string,
    @Query("bankCode") bankCode: string,
  ) {
    return this.payments.resolveBankAccount(accountNumber, bankCode);
  }

  @Patch("platform-charges")
  @RateLimit({ limit: 10, windowSeconds: 600 })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Platform charges updated")
  updatePlatformCharges(@Body() input: UpdatePlatformChargesDto) {
    return this.payments.updatePlatformCharges(input);
  }

  @Post("initiate")
  @RateLimit({ limit: 10, windowSeconds: 60 })
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
  @SkipRateLimit()
  @HttpCode(200)
  @ApiOperation({
    summary: "Payment provider webhook receiver",
    description:
      "Receives charge.success / charge.failed / payment_session.completed events from payment provider. " +
      "Validates signature. No auth cookie required.",
  })
  async webhook(@Req() request: RawBodyRequest<Request>) {
    const rawBody = request.rawBody;

    if (!rawBody) {
      this.logger.warn("Webhook received without rawBody — check rawBody: true in NestFactory");
      return { received: false };
    }

    const headers = request.headers;
    const getHeader = (name: string): string => {
      const val = headers[name];
      if (Array.isArray(val)) return val[0] ?? "";
      return val ?? "";
    };

    const signature = getHeader("x-paystack-signature") || getHeader("webhook-signature");

    const headersMap: Record<string, string> = {};
    for (const [key, val] of Object.entries(headers)) {
      if (val !== undefined) {
        headersMap[key] = Array.isArray(val) ? (val[0] ?? "") : val;
      }
    }

    this.logger.log(
      `Inbound payment webhook HTTP POST request received (signature header: ${signature ? "present" : "missing"})`,
    );

    const event = await this.paymentAdapter.parseWebhookEvent(rawBody, signature, headersMap);

    if (!event) {
      this.logger.warn("Webhook ignored: signature verification failed or event type unhandled");
      return { received: false };
    }

    this.logger.log(
      `Webhook parsed successfully: eventId=${event.eventId}, type=${event.eventType}, reference=${event.reference}, status=${event.status}, amountMinor=${event.amountMinor}`,
    );

    const result = await this.payments.confirmPayment(event);
    this.logger.log(
      `Webhook payment confirmation finished for reference ${event.reference} (alreadyProcessed=${result.already})`,
    );

    return { received: true, already: result.already };
  }

  /**
   * Frontend polling fallback when webhook delivery is delayed.
   * Authenticated — customers can only verify their own payments.
   */
  @Get("verify/:reference")
  @RateLimit({ limit: 60, windowSeconds: 60 })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Payment status retrieved")
  verify(@Req() request: AuthenticatedRequest, @Param("reference") reference: string) {
    return this.payments.verifyPayment(request.user!, reference);
  }

  @Post("orders/:orderId/retry")
  @RateLimit({ limit: 5, windowSeconds: 60 })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Payment retry initiated successfully")
  @ApiOperation({
    summary: "Retry payment for an existing order",
    description:
      "Creates a fresh provider checkout for a failed or incomplete payment without creating a new order.",
  })
  retry(
    @Req() request: AuthenticatedRequest,
    @Param("orderId") orderId: string,
    @Body() input: RetryPaymentDto,
  ) {
    return this.payments.retryOrderPayment(request.user!, orderId, input);
  }

  @Get("refund-requests")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Refund requests retrieved")
  @ApiOperation({
    summary: "List refund requests",
    description:
      "Super-admin endpoint for reviewing customer refund requests and processed refunds, with optional status, reference, customer, requester, and date filters.",
  })
  listRefundRequests(@Query() query: ListRefundRequestsQueryDto) {
    return this.payments.listRefundRequests(query);
  }

  @Post(":reference/refund-request")
  @RateLimit({ limit: 5, windowSeconds: 600 })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiMessage("Refund request submitted")
  @ApiOperation({
    summary: "Request a refund for a successful payment",
    description:
      "Customer endpoint for requesting a full or partial refund. This records a pending refund request for super-admin review; it does not move money immediately.",
  })
  requestRefund(
    @Req() request: AuthenticatedRequest,
    @Param("reference") reference: string,
    @Body() input: RequestRefundDto,
  ) {
    return this.payments.requestRefund(request.user!, reference, input);
  }

  @Post(":reference/refund")
  @RateLimit({ limit: 10, windowSeconds: 600 })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Refund processed")
  @ApiOperation({
    summary: "Process a payment refund",
    description:
      "Super-admin endpoint for full or partial refunds. Omit amountMinor to refund the remaining full payment amount.",
  })
  refund(
    @Req() request: AuthenticatedRequest,
    @Param("reference") reference: string,
    @Body() input: ProcessRefundDto,
  ) {
    return this.payments.processRefund(request.user!, reference, input);
  }
}
