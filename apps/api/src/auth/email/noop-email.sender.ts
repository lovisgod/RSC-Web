import { Injectable, Logger } from "@nestjs/common";

import type {
  EmailSender,
  SendDatabaseBackupEmailInput,
  SendPasswordResetEmailInput,
  SendMarketingEmailInput,
  SendOrderReceiptEmailInput,
  SendTemporaryPasswordEmailInput,
  SendWelcomeVerificationEmailInput,
} from "./email-sender";

@Injectable()
export class NoopEmailSender implements EmailSender {
  private readonly logger = new Logger(NoopEmailSender.name);

  sendWelcomeVerification(input: SendWelcomeVerificationEmailInput): Promise<void> {
    this.logger.debug(`Skipping welcome email for ${input.email}`);

    return Promise.resolve();
  }

  sendPasswordReset(input: SendPasswordResetEmailInput): Promise<void> {
    this.logger.debug(`Skipping password reset email for ${input.email}`);

    return Promise.resolve();
  }

  sendTemporaryPassword(input: SendTemporaryPasswordEmailInput): Promise<void> {
    this.logger.debug(`Skipping temporary password email for ${input.email}`);

    return Promise.resolve();
  }

  sendMarketing(input: SendMarketingEmailInput): Promise<void> {
    this.logger.debug(`Skipping marketing email for ${input.email}`);

    return Promise.resolve();
  }

  sendDatabaseBackup(input: SendDatabaseBackupEmailInput): Promise<void> {
    this.logger.debug(`Skipping database backup email for ${input.emails.join(", ")}`);

    return Promise.resolve();
  }

  sendOrderReceipt(input: SendOrderReceiptEmailInput): Promise<void> {
    this.logger.debug(
      `Skipping order receipt email for ${input.email} (order ${input.masterOrderId})`,
    );

    return Promise.resolve();
  }
}
