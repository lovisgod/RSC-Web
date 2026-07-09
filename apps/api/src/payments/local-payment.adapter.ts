import { Injectable } from "@nestjs/common";

import type {
  InitiateProviderPaymentInput,
  InitiateProviderPaymentResult,
  ParsedWebhookEvent,
  PaymentAdapter,
  ProvisionSubaccountInput,
  ProvisionSubaccountResult,
  VerifyProviderPaymentResult,
} from "./payment-adapter";

@Injectable()
export class LocalPaymentAdapter implements PaymentAdapter {
  initiate(input: InitiateProviderPaymentInput): Promise<InitiateProviderPaymentResult> {
    return Promise.resolve({
      gateway: "local",
      reference: input.reference,
      checkoutUrl: null,
      status: "SUCCESS",
      providerResponse: {
        message: "Local payment adapter recorded a successful transaction",
        splitRoutes: input.splitRoutes,
      },
    });
  }

  verify(reference: string): Promise<VerifyProviderPaymentResult> {
    return Promise.resolve({
      reference,
      amountMinor: 0,
      status: "SUCCESS",
      providerResponse: { message: "Local adapter: payment always succeeds" },
    });
  }

  // The local adapter does not handle real webhooks; always returns null.
  parseWebhookEvent(_rawBody: Buffer, _signature: string): Promise<ParsedWebhookEvent | null> {
    return Promise.resolve(null);
  }

  provisionSubaccount(input: ProvisionSubaccountInput): Promise<ProvisionSubaccountResult> {
    return Promise.resolve({
      subaccountCode: `LOCAL_ACCT_${input.accountNumber}`,
      providerResponse: { message: "Local adapter: subaccount provisioned (dev only)" },
    });
  }
}
