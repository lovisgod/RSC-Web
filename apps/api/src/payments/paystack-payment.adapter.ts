import { createHmac, timingSafeEqual } from "node:crypto";

import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApplicationConfig } from "../config/configuration";
import type {
  InitiateProviderPaymentInput,
  InitiateProviderPaymentResult,
  ParsedWebhookEvent,
  PaymentAdapter,
  ProvisionSubaccountInput,
  ProvisionSubaccountResult,
  RefundProviderPaymentInput,
  RefundProviderPaymentResult,
  VerifyProviderPaymentResult,
} from "./payment-adapter";

// ---------------------------------------------------------------------------
// Paystack response shapes (minimal — we only pick what we need)
// ---------------------------------------------------------------------------

interface PaystackInitializeResponse {
  status?: boolean;
  message?: string;
  data?: {
    authorization_url?: string;
    access_code?: string;
    reference?: string;
  };
}

interface PaystackVerifyResponse {
  status?: boolean;
  message?: string;
  data?: {
    status?: string; // "success" | "failed" | "pending" | "abandoned"
    amount?: number; // in kobo (minor units)
    reference?: string;
  };
}

interface PaystackCreateSplitResponse {
  status?: boolean;
  message?: string;
  data?: {
    split_code?: string;
  };
}

interface PaystackCreateSubaccountResponse {
  status?: boolean;
  message?: string;
  data?: {
    subaccount_code?: string;
  };
}

interface PaystackRefundResponse {
  status?: boolean;
  message?: string;
  data?: {
    id?: number;
    refund_reference?: string;
    status?: string;
  };
}

// Paystack webhook event envelope
interface PaystackWebhookEvent {
  event?: string;
  data?: {
    id?: number;
    reference?: string;
    status?: string;
    amount?: number; // kobo
    [key: string]: unknown;
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

@Injectable()
export class PaystackPaymentAdapter implements PaymentAdapter {
  private readonly logger = new Logger(PaystackPaymentAdapter.name);
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(configService: ConfigService<ApplicationConfig, true>) {
    const config = configService.get("payments.paystack", { infer: true });

    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl;
  }

  // -------------------------------------------------------------------------
  // initiate — create a Paystack checkout session with optional split
  // -------------------------------------------------------------------------

  async initiate(input: InitiateProviderPaymentInput): Promise<InitiateProviderPaymentResult> {
    const subaccounts = input.splitRoutes.filter((route) =>
      isPaystackSubaccountCode(route.subaccountCode),
    );
    const splitCode = subaccounts.length ? await this.createSplit(input, subaccounts) : null;
    const body = {
      email: input.email,
      amount: input.amountMinor,
      currency: input.currency,
      reference: input.reference,
      ...(splitCode ? { split_code: splitCode } : {}),
    };

    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as PaystackInitializeResponse;

      if (!response.ok || !payload.status || !payload.data?.authorization_url) {
        this.logger.error(
          `Paystack rejected transaction initialize: ${JSON.stringify({
            status: response.status,
            message: payload.message ?? null,
          })}`,
        );
        throw new BadGatewayException("Unable to initiate payment");
      }

      return {
        gateway: "paystack",
        reference: payload.data.reference ?? input.reference,
        checkoutUrl: payload.data.authorization_url,
        status: "PENDING",
        providerResponse: payload,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.error("Paystack transaction initialize request failed", error);
      throw new BadGatewayException("Unable to initiate payment");
    }
  }

  // -------------------------------------------------------------------------
  // verify — poll Paystack for the current status of a payment by reference
  // -------------------------------------------------------------------------

  async verify(reference: string): Promise<VerifyProviderPaymentResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: this.authHeaders() },
      );
      const payload = (await response.json().catch(() => ({}))) as PaystackVerifyResponse;

      if (!response.ok || !payload.status) {
        this.logger.error(
          `Paystack verify failed for ${reference}: ${JSON.stringify({
            status: response.status,
            message: payload.message ?? null,
          })}`,
        );
        throw new BadGatewayException("Unable to verify payment");
      }

      const paystackStatus = payload.data?.status ?? "pending";

      return {
        reference: payload.data?.reference ?? reference,
        amountMinor: payload.data?.amount ?? 0,
        status: mapPaystackStatus(paystackStatus),
        providerResponse: payload,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.error(`Paystack verify request failed for ${reference}`, error);
      throw new BadGatewayException("Unable to verify payment");
    }
  }

  // -------------------------------------------------------------------------
  // parseWebhookEvent — validate HMAC-SHA512 signature and parse payload
  // -------------------------------------------------------------------------

  async parseWebhookEvent(rawBody: Buffer, signature: string): Promise<ParsedWebhookEvent | null> {
    await Promise.resolve();
    // Paystack signs the raw body with HMAC-SHA512 using the secret key
    if (!this.verifyPaystackSignature(rawBody, signature)) {
      this.logger.warn("Paystack webhook: invalid signature — request rejected");
      return null;
    }

    let event: PaystackWebhookEvent;

    try {
      event = JSON.parse(rawBody.toString("utf8")) as PaystackWebhookEvent;
    } catch {
      this.logger.warn("Paystack webhook: body is not valid JSON");
      return null;
    }

    const eventType = event.event ?? "";
    const data = event.data ?? {};

    // We only act on charge.success and charge.failed
    if (eventType !== "charge.success" && eventType !== "charge.failed") {
      return null;
    }

    const reference = data.reference;

    if (!reference) {
      this.logger.warn(`Paystack webhook: ${eventType} event missing reference`);
      return null;
    }

    // Paystack uses the numeric transaction ID as the unique event identifier
    const eventId = data.id != null ? String(data.id) : reference;

    return {
      eventId,
      eventType,
      reference,
      status: eventType === "charge.success" ? "SUCCESS" : "FAILED",
      amountMinor: data.amount ?? 0,
      providerResponse: event,
    };
  }

  // -------------------------------------------------------------------------
  // provisionSubaccount — register an outlet bank account on Paystack
  // -------------------------------------------------------------------------

  async provisionSubaccount(input: ProvisionSubaccountInput): Promise<ProvisionSubaccountResult> {
    const body = {
      business_name: input.businessName,
      bank_code: input.bankCode,
      account_number: input.accountNumber,
      percentage_charge: input.percentageCharge,
    };

    try {
      const response = await fetch(`${this.baseUrl}/subaccount`, {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as PaystackCreateSubaccountResponse;

      if (!response.ok || !payload.status || !payload.data?.subaccount_code) {
        this.logger.error(
          `Paystack rejected subaccount creation: ${JSON.stringify({
            status: response.status,
            message: (payload as { message?: string }).message ?? null,
          })}`,
        );
        throw new BadGatewayException("Unable to provision subaccount");
      }

      return {
        subaccountCode: payload.data.subaccount_code,
        providerResponse: payload,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.error("Paystack subaccount creation request failed", error);
      throw new BadGatewayException("Unable to provision subaccount");
    }
  }

  async refund(input: RefundProviderPaymentInput): Promise<RefundProviderPaymentResult> {
    const body = {
      transaction: input.reference,
      amount: input.amountMinor,
      currency: input.currency,
      ...(input.reason ? { merchant_note: input.reason } : {}),
    };

    try {
      const response = await fetch(`${this.baseUrl}/refund`, {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as PaystackRefundResponse;

      if (!response.ok || !payload.status) {
        this.logger.error(
          `Paystack rejected refund: ${JSON.stringify({
            status: response.status,
            message: payload.message ?? null,
          })}`,
        );
        throw new BadGatewayException("Unable to process refund");
      }

      return {
        providerRefundId:
          payload.data?.refund_reference ?? (payload.data?.id ? String(payload.data.id) : null),
        status: mapPaystackRefundStatus(payload.data?.status),
        providerResponse: payload,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.error("Paystack refund request failed", error);
      throw new BadGatewayException("Unable to process refund");
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async createSplit(
    input: InitiateProviderPaymentInput,
    subaccounts: Array<InitiateProviderPaymentInput["splitRoutes"][number]>,
  ): Promise<string> {
    const body = {
      name: input.reference,
      type: "flat",
      currency: input.currency,
      bearer_type: "account",
      subaccounts: subaccounts.map((route) => ({
        subaccount: route.subaccountCode,
        share: route.netMinor,
      })),
    };

    try {
      const response = await fetch(`${this.baseUrl}/split`, {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as PaystackCreateSplitResponse;

      if (!response.ok || !payload.status || !payload.data?.split_code) {
        this.logger.error(
          `Paystack rejected split creation: ${JSON.stringify({
            status: response.status,
            message: payload.message ?? null,
          })}`,
        );
        throw new BadGatewayException("Unable to create payment split");
      }

      return payload.data.split_code;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.error("Paystack split creation request failed", error);
      throw new BadGatewayException("Unable to create payment split");
    }
  }

  private verifyPaystackSignature(rawBody: Buffer, signature: string): boolean {
    try {
      const expected = createHmac("sha512", this.secretKey).update(rawBody).digest("hex");
      const expectedBuf = Buffer.from(expected, "utf8");
      const receivedBuf = Buffer.from(signature, "utf8");

      if (expectedBuf.length !== receivedBuf.length) return false;

      return timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
      return false;
    }
  }

  private authHeaders(): Record<string, string> {
    return {
      authorization: `Bearer ${this.secretKey}`,
      "content-type": "application/json",
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPaystackSubaccountCode(value: string | null): value is string {
  return typeof value === "string" && value.startsWith("ACCT_");
}

function mapPaystackStatus(paystackStatus: string): "PENDING" | "SUCCESS" | "FAILED" {
  if (paystackStatus === "success") return "SUCCESS";
  if (paystackStatus === "failed" || paystackStatus === "abandoned") return "FAILED";

  return "PENDING";
}

function mapPaystackRefundStatus(status: string | undefined): "PENDING" | "SUCCESS" | "FAILED" {
  if (!status) return "PENDING";

  const normalized = status.toLowerCase();
  if (normalized === "processed" || normalized === "success" || normalized === "successful") {
    return "SUCCESS";
  }
  if (normalized === "failed") {
    return "FAILED";
  }

  return "PENDING";
}
