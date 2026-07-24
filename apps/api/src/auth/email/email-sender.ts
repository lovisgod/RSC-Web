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
  email: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  createdAt: Date;
}

export interface EmailSender {
  sendWelcomeVerification(input: SendWelcomeVerificationEmailInput): Promise<void>;
  sendPasswordReset(input: SendPasswordResetEmailInput): Promise<void>;
  sendTemporaryPassword(input: SendTemporaryPasswordEmailInput): Promise<void>;
  sendMarketing(input: SendMarketingEmailInput): Promise<void>;
  sendDatabaseBackup(input: SendDatabaseBackupEmailInput): Promise<void>;
}

export const EMAIL_SENDER = Symbol("EMAIL_SENDER");
