export interface PaymentSplitRoute {
  outletId: string;
  subaccountCode: string | null;
  grossMinor: number;
  commissionMinor: number;
  netMinor: number;
}

export interface InitiateProviderPaymentInput {
  email: string;
  amountMinor: number;
  currency: "NGN";
  reference: string;
  splitRoutes: PaymentSplitRoute[];
}

export interface InitiateProviderPaymentResult {
  gateway: string;
  reference: string;
  checkoutUrl: string | null;
  status: "PENDING" | "SUCCESS";
  providerResponse: unknown;
}

export interface PaymentAdapter {
  initiate(input: InitiateProviderPaymentInput): Promise<InitiateProviderPaymentResult>;
}

export const PAYMENT_ADAPTER = Symbol("PAYMENT_ADAPTER");
