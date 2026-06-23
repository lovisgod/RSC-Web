export interface SendPhoneVerificationInput {
  phone: string;
  code: string;
  expiresInMinutes: number;
}

export interface SmsSender {
  sendPhoneVerification(input: SendPhoneVerificationInput): Promise<void>;
}

export const SMS_SENDER = Symbol("SMS_SENDER");
