import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApplicationConfig } from "../config/configuration";
import type {
  InitiateProviderPaymentInput,
  InitiateProviderPaymentResult,
  PaymentAdapter,
} from "./payment-adapter";

interface PaystackInitializeResponse {
  status?: boolean;
  message?: string;
  data?: {
    authorization_url?: string;
    access_code?: string;
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
        headers: {
          authorization: `Bearer ${this.secretKey}`,
          "content-type": "application/json",
        },
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
      if (error instanceof BadGatewayException) {
        throw error;
      }

      this.logger.error("Paystack transaction initialize request failed");
      throw new BadGatewayException("Unable to initiate payment");
    }
  }

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
        headers: {
          authorization: `Bearer ${this.secretKey}`,
          "content-type": "application/json",
        },
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
      if (error instanceof BadGatewayException) {
        throw error;
      }

      this.logger.error("Paystack split creation request failed");
      throw new BadGatewayException("Unable to create payment split");
    }
  }
}

function isPaystackSubaccountCode(value: string | null): value is string {
  return typeof value === "string" && value.startsWith("ACCT_");
}
