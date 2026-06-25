import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

import type { ApplicationConfig } from "../../config/configuration";
import type { EmailSender, SendWelcomeVerificationEmailInput } from "./email-sender";

@Injectable()
export class ResendEmailSender implements EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private readonly config: ApplicationConfig["email"]["resend"];
  private readonly resend: Resend;

  constructor(configService: ConfigService<ApplicationConfig, true>) {
    this.config = configService.get("email.resend", { infer: true });
    this.resend = new Resend(this.config.apiKey);
  }

  async sendWelcomeVerification(input: SendWelcomeVerificationEmailInput): Promise<void> {
    const subject = "Welcome to RSC - verify your email";
    const text = [
      `Hi ${input.name},`,
      "",
      "Welcome to RSC.",
      `Your email verification code is ${input.code}.`,
      `It expires in ${input.expiresInMinutes} minutes.`,
    ].join("\n");
    const html = `
      <p>Hi ${this.escapeHtml(input.name)},</p>
      <p>Welcome to RSC.</p>
      <p>Your email verification code is <strong>${input.code}</strong>.</p>
      <p>It expires in ${input.expiresInMinutes} minutes.</p>
    `;

    this.logger.log(
      `Sending Resend welcome email: ${JSON.stringify({
        from: this.config.from,
        to: input.email,
        subject,
      })}`,
    );

    const { error } = await this.resend.emails.send({
      from: this.config.from,
      to: [input.email],
      subject,
      html,
      text,
      ...(this.config.replyTo ? { replyTo: this.config.replyTo } : {}),
      tags: [{ name: "category", value: "registration_verification" }],
    });

    if (error) {
      this.logger.error(
        `Resend rejected welcome email: ${JSON.stringify({ message: error.message })}`,
      );
      throw new BadGatewayException("Unable to send email verification code");
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
}
