export interface PaymentSplitRoute {
  outletId: string;
  outletName: string | null;
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
  returnUrl?: string;
  /** Customer's display name — sent on first checkout so Moment can create the customer record */
  customerName?: string;
  /** Moment customer ID from a previous checkout — enables saved-card fast-path */
  momentCustomerId?: string | null;
}

export interface InitiateProviderPaymentResult {
  gateway: string;
  reference: string;
  checkoutUrl: string | null;
  status: "PENDING" | "SUCCESS";
  providerResponse: unknown;
  /** Moment customer ID returned by Moment after the session is created. Persist this on the customer record. */
  momentCustomerId?: string | null;
}

export interface VerifyProviderPaymentResult {
  status: "PENDING" | "SUCCESS" | "FAILED";
  amountMinor: number;
  reference: string;
  providerResponse: unknown;
}

export interface RefundProviderPaymentInput {
  reference: string;
  amountMinor: number;
  currency: "NGN";
  reason?: string;
}

export interface RefundProviderPaymentResult {
  providerRefundId: string | null;
  status: "PENDING" | "SUCCESS" | "FAILED";
  providerResponse: unknown;
}

export interface ParsedWebhookEvent {
  /** Unique identifier from the provider — used for idempotency deduplication */
  eventId: string;
  /** Provider event type string, e.g. "charge.success" */
  eventType: string;
  /** The payment reference that maps to our order */
  reference: string;
  /** PENDING represents a non-terminal provider update, such as a retryable failed attempt. */
  status: "PENDING" | "SUCCESS" | "FAILED";
  amountMinor: number;
  /** Provider-reported success time. Falls back to webhook receipt time when omitted. */
  succeededAt?: string;
  providerResponse: unknown;
}

export interface ProvisionSubaccountInput {
  businessName: string;
  bankCode: string;
  accountNumber: string;
  /** Platform commission percentage charged to this subaccount (0–100) */
  percentageCharge: number;
}

export interface ProvisionSubaccountResult {
  /** The provider-issued subaccount code, e.g. ACCT_xxx on Paystack */
  subaccountCode: string;
  providerResponse: unknown;
}

export interface PaymentAdapter {
  /** Initiate a new checkout session, optionally with split routing */
  initiate(input: InitiateProviderPaymentInput): Promise<InitiateProviderPaymentResult>;

  /**
   * Verify a payment by reference. Used as webhook fallback / polling.
   * Returns PENDING if the provider has not settled yet.
   */
  verify(reference: string): Promise<VerifyProviderPaymentResult>;

  /**
   * Parse and authenticate an inbound webhook payload.
   * Returns null if the signature is invalid or the event type is not actionable.
   */
  parseWebhookEvent(
    rawBody: Buffer,
    signature: string,
    headers?: Record<string, string>,
  ): Promise<ParsedWebhookEvent | null>;

  /**
   * Register a new subaccount (outlet bank account) with the provider.
   * Returns the provider-issued subaccount code to be stored on the outlet.
   */
  provisionSubaccount(input: ProvisionSubaccountInput): Promise<ProvisionSubaccountResult>;

  /** Initiate a full or partial refund for a successful provider payment. */
  refund(input: RefundProviderPaymentInput): Promise<RefundProviderPaymentResult>;
}

export const PAYMENT_ADAPTER = Symbol("PAYMENT_ADAPTER");
