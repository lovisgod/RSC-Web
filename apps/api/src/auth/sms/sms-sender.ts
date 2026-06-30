export interface SendPhoneVerificationInput {
  phone: string;
  code: string;
  expiresInMinutes: number;
}

export interface SendPasswordResetSmsInput {
  phone: string;
  code: string;
  expiresInMinutes: number;
}

export interface SmsSender {
  sendPhoneVerification(input: SendPhoneVerificationInput): Promise<void>;
  sendPasswordReset(input: SendPasswordResetSmsInput): Promise<void>;
}

export const SMS_SENDER = Symbol("SMS_SENDER");
