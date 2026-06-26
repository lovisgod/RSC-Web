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

export interface EmailSender {
  sendWelcomeVerification(input: SendWelcomeVerificationEmailInput): Promise<void>;
  sendPasswordReset(input: SendPasswordResetEmailInput): Promise<void>;
}

export const EMAIL_SENDER = Symbol("EMAIL_SENDER");
