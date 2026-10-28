export interface SendWelcomeVerificationEmailInput {
  email: string;
  name: string;
  code: string;
  expiresInMinutes: number;
}

export interface SendPasswordResetEmailInput {
  email: string;
  name: string;
  code: string;
  expiresInMinutes: number;
}

export interface SendTemporaryPasswordEmailInput {
  email: string;
  name: string;
  role: string;
  temporaryPassword: string;
}

export interface SendMarketingEmailInput {
  email: string;
  name: string;
  subject: string;
  title: string;
  body: string;
  preheader?: string;
}

export interface SendDatabaseBackupEmailInput {
  emails: string[];
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  createdAt: Date;
}

export interface OrderReceiptItem {
  name: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
  notes?: string | null;
}

export interface OrderReceiptGroup {
  outletName: string;
  items: OrderReceiptItem[];
  subtotalMinor: number;
}

export interface SendOrderReceiptEmailInput {
  email: string;
  customerName: string;
  masterOrderId: string;
  paymentReference: string;
  paymentGateway: string;
  paidAt: Date;
  deliveryMode: "DELIVERY" | "TAKEOUT";
  deliveryAddress?: string | null;
  recipientPhone?: string | null;
  groups: OrderReceiptGroup[];
  totals: {
    subtotalMinor: number;
    deliveryFeeMinor: number;
    vatMinor: number;
    platformCommissionMinor?: number;
    serviceFeeMinor?: number;
    discountMinor?: number;
    totalMinor: number;
    currency: "NGN";
  };
}

export interface EmailSender {
  sendWelcomeVerification(input: SendWelcomeVerificationEmailInput): Promise<void>;
  sendPasswordReset(input: SendPasswordResetEmailInput): Promise<void>;
  sendTemporaryPassword(input: SendTemporaryPasswordEmailInput): Promise<void>;
  sendMarketing(input: SendMarketingEmailInput): Promise<void>;
  sendDatabaseBackup(input: SendDatabaseBackupEmailInput): Promise<void>;
  sendOrderReceipt(input: SendOrderReceiptEmailInput): Promise<void>;
}

export const EMAIL_SENDER = Symbol("EMAIL_SENDER");
