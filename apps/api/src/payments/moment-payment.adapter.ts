import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  BadGatewayException,
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";

import type { ApplicationConfig } from "../config/configuration";
import type {
  InitiateProviderPaymentInput,
  InitiateProviderPaymentResult,
  ParsedWebhookEvent,
  PaymentAdapter,
  ProvisionSubaccountInput,
  ProvisionSubaccountResult,
  RefundProviderPaymentResult,
  VerifyProviderPaymentResult,
} from "./payment-adapter";
import { Payment } from "./payment.entity";

interface MomentInitializeResponse {
  id?: string;
  session_url?: string;
  status?: string;
  payment_outcome?: string;
  amount?: number;
  message?: string;
}

interface MomentWebhookPayload {
  id?: string;
  type?: string;
  data?: {
    external_reference?: string;
    payment_outcome?: string;
    status?: string;
    amount?: number;
  };
}

@Injectable()
export class MomentPaymentAdapter implements PaymentAdapter {
  private readonly logger = new Logger(MomentPaymentAdapter.name);
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly webhookSecret: string;
  private readonly customerWebUrl: string;

  constructor(
    configService: ConfigService<ApplicationConfig, true>,
    private readonly dataSource: DataSource,
  ) {
    const config = configService.get("payments.moment", { infer: true });
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl;
    this.webhookSecret = config.webhookSecret;
    this.customerWebUrl = configService.get("app.customerWebUrl", { infer: true });
  }

  async initiate(input: InitiateProviderPaymentInput): Promise<InitiateProviderPaymentResult> {
    const metadata: Record<string, string> = {};
    for (const route of input.splitRoutes) {
      if (route.subaccountCode) {
        metadata[route.subaccountCode] = String(route.netMinor);
      }
    }

    const body = {
      amount: input.amountMinor,
      currency: input.currency,
      type: "one_time",
      external_reference: input.reference,
      metadata,
      options: {
        checkout_options: {
          presentation_mode: { mode: "redirect" },
          return_url: this.buildReturnUrl(input.reference, input.returnUrl),
        },
      },
    };
    const idempotencyKey = this.createIdempotencyKey(input.reference);

    try {
      const response = await fetch(`${this.baseUrl}/collect/payment_sessions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.secretKey}`,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(body),
      });

      const payload = (await response.json().catch(() => ({}))) as MomentInitializeResponse;

      if (!response.ok || !payload.session_url) {
        this.logger.error(
          `Moment rejected payment initiation: ${JSON.stringify({
            status: response.status,
            message: payload.message ?? null,
            payload,
          })}`,
        );
        throw new BadGatewayException("Unable to initiate payment with Moment");
      }

      return {
        gateway: "moment",
        reference: input.reference,
        checkoutUrl: payload.session_url,
        status: "PENDING",
        providerResponse: payload,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.error(`Moment initiate request failed for reference ${input.reference}`, error);
      throw new BadGatewayException("Unable to initiate payment");
    }
  }

  private createIdempotencyKey(reference: string): string {
    const uuid = reference.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    )?.[0];

    if (uuid) {
      return uuid.toLowerCase();
    }

    const hash = createHash("sha256").update(reference).digest("hex").slice(0, 32);
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
  }

  private buildReturnUrl(reference: string, returnUrl?: string): string {
    const url = returnUrl ? new URL(returnUrl) : new URL("/tracking", this.customerWebUrl);
    url.searchParams.set("reference", reference);

    return url.toString();
  }

  async verify(reference: string): Promise<VerifyProviderPaymentResult> {
    try {
      const payment = await this.dataSource.getRepository(Payment).findOneBy({ reference });
      if (!payment) {
        throw new NotFoundException(`Payment not found for reference ${reference}`);
      }

      const providerResponse = payment.providerResponse as Record<string, unknown> | null;
      const sessionId = typeof providerResponse?.id === "string" ? providerResponse.id : undefined;
      if (!sessionId) {
        throw new BadRequestException(`No session ID found for payment reference ${reference}`);
      }

      const response = await fetch(`${this.baseUrl}/collect/payment_sessions/${sessionId}`, {
        headers: {
          authorization: `Bearer ${this.secretKey}`,
        },
      });

      if (!response.ok) {
        this.logger.error(
          `Moment verify request failed for ${reference} (session ${sessionId}) with status ${response.status}`,
        );
        throw new BadGatewayException("Unable to verify payment with Moment");
      }

      const payload = (await response.json()) as MomentInitializeResponse;
      const momentStatus = payload.status;
      const momentOutcome = payload.payment_outcome;

      let status: "PENDING" | "SUCCESS" | "FAILED" = "PENDING";
      if (momentOutcome === "paid" || momentStatus === "completed") {
        status = "SUCCESS";
      } else if (
        momentStatus === "cancelled" ||
        momentStatus === "expired" ||
        momentOutcome === "unpaid"
      ) {
        status = "FAILED";
      }

      return {
        reference,
        amountMinor: payload.amount ?? payment.amountMinor,
        status,
        providerResponse: payload as unknown as Record<string, unknown>,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof BadGatewayException
      ) {
        throw error;
      }
      this.logger.error(`Moment verify request failed for ${reference}`, error);
      throw new BadGatewayException("Unable to verify payment");
    }
  }

  async parseWebhookEvent(
    rawBody: Buffer,
    signatureHeader: string,
    headers?: Record<string, string>,
  ): Promise<ParsedWebhookEvent | null> {
    await Promise.resolve();

    if (!headers) {
      this.logger.warn("Moment webhook: parse request called without headers");
      return null;
    }

    const id = headers["webhook-id"];
    const timestamp = headers["webhook-timestamp"];

    if (!id || !timestamp || !signatureHeader) {
      this.logger.warn("Moment webhook: missing id, timestamp or signature headers");
      return null;
    }

    // Generate signed content: id.timestamp.rawBody
    const signedContent = `${id}.${timestamp}.${rawBody.toString("utf8")}`;

    // Verify signature
    if (!this.verifyMomentSignature(signedContent, signatureHeader)) {
      this.logger.warn("Moment webhook: invalid signature — request rejected");
      return null;
    }

    let event: MomentWebhookPayload;
    try {
      event = JSON.parse(rawBody.toString("utf8")) as MomentWebhookPayload;
    } catch {
      this.logger.warn("Moment webhook: body is not valid JSON");
      return null;
    }

    const eventType = event.type ?? "";
    const data = event.data ?? {};

    // We only act on payment_session.completed
    if (eventType !== "payment_session.completed") {
      return null;
    }

    const reference = data.external_reference;
    if (!reference) {
      this.logger.warn(`Moment webhook: ${eventType} event missing external_reference`);
      return null;
    }

    return {
      eventId: event.id ?? reference,
      eventType,
      reference,
      status: data.payment_outcome === "paid" || data.status === "completed" ? "SUCCESS" : "FAILED",
      amountMinor: data.amount ?? 0,
      providerResponse: event as unknown as Record<string, unknown>,
    };
  }

  async provisionSubaccount(input: ProvisionSubaccountInput): Promise<ProvisionSubaccountResult> {
    await Promise.resolve();
    // Subaccounts are managed via Moment's dashboard UI.
    // Return a mocked subaccount code to allow settings onboarding flow to proceed if called.
    const mockCode = `moment_sub_${Math.random().toString(36).substring(2, 10)}`;
    return {
      subaccountCode: mockCode,
      providerResponse: { info: "Provisioned via dashboard UI mock fallback", input },
    };
  }

  async refund(): Promise<RefundProviderPaymentResult> {
    await Promise.resolve();
    throw new BadGatewayException("Refunds are not supported by the Moment adapter yet");
  }

  private verifyMomentSignature(signedContent: string, signatureHeader: string): boolean {
    try {
      if (!this.webhookSecret) {
        this.logger.error("Moment webhook: MOMENT_WEBHOOK_SECRET is not configured");
        return false;
      }

      // Exclude whsec_ prefix if present
      const secretPart = this.webhookSecret.startsWith("whsec_")
        ? this.webhookSecret.split("_")[1] || ""
        : this.webhookSecret;

      const secretBytes = Buffer.from(secretPart, "base64");

      const expectedSignature = createHmac("sha256", secretBytes)
        .update(signedContent)
        .digest("base64");

      // Extract the signature value from the list of signatures
      // e.g. "v1,signature_value" or "v1,sig1 v1,sig2"
      const parts = signatureHeader.split(" ");
      for (const part of parts) {
        const subparts = part.split(",");
        if (subparts.length === 2 && subparts[0] === "v1") {
          const signature = subparts[1];
          if (signature && this.timingSafeCompare(expectedSignature, signature)) {
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      this.logger.error("Failed to verify Moment webhook signature", error);
      return false;
    }
  }

  private timingSafeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }
}
