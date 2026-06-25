import { Injectable, Logger } from "@nestjs/common";

import type { EmailSender, SendWelcomeVerificationEmailInput } from "./email-sender";

@Injectable()
export class NoopEmailSender implements EmailSender {
  private readonly logger = new Logger(NoopEmailSender.name);

  sendWelcomeVerification(input: SendWelcomeVerificationEmailInput): Promise<void> {
    this.logger.debug(`Skipping welcome email for ${input.email}`);

    return Promise.resolve();
  }
}
