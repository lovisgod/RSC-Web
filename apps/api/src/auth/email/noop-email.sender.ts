import { Injectable, Logger } from "@nestjs/common";

import type {
  EmailSender,
  SendPasswordResetEmailInput,
  SendMarketingEmailInput,
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
}
