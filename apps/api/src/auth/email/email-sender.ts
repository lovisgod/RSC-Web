export interface SendWelcomeVerificationEmailInput {
  email: string;
  name: string;
  code: string;
  expiresInMinutes: number;
}

export interface EmailSender {
  sendWelcomeVerification(input: SendWelcomeVerificationEmailInput): Promise<void>;
}

export const EMAIL_SENDER = Symbol("EMAIL_SENDER");
