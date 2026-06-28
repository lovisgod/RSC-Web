import { Injectable } from "@nestjs/common";

import type {
  InitiateProviderPaymentInput,
  InitiateProviderPaymentResult,
  PaymentAdapter,
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
}
