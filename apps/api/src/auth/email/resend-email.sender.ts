import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApplicationConfig } from "../../config/configuration";
import type {
  EmailSender,
  SendPasswordResetEmailInput,
  SendTemporaryPasswordEmailInput,
  SendWelcomeVerificationEmailInput,
} from "./email-sender";

interface ResendSendResponse {
  id?: string;
  message?: string;
  name?: string;
}

@Injectable()
export class ResendEmailSender implements EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private readonly config: ApplicationConfig["email"]["resend"];

  constructor(configService: ConfigService<ApplicationConfig, true>) {
    this.config = configService.get("email.resend", { infer: true });
  }

  async sendWelcomeVerification(input: SendWelcomeVerificationEmailInput): Promise<void> {
    await this.sendEmail({
      to: input.email,
      subject: "Welcome to RSC - verify your email",
      html: `
        <p>Hi ${this.escapeHtml(input.name)},</p>
        <p>Welcome to RSC.</p>
        <p>Your email verification code is <strong>${input.code}</strong>.</p>
        <p>It expires in ${input.expiresInMinutes} minutes.</p>
      `,
    });
  }

  async sendPasswordReset(input: SendPasswordResetEmailInput): Promise<void> {
    await this.sendEmail({
      to: input.email,
      subject: "Reset your RSC password",
      html: `
        <p>Hi ${this.escapeHtml(input.name)},</p>
        <p>Your RSC password reset code is <strong>${input.code}</strong>.</p>
        <p>It expires in ${input.expiresInMinutes} minutes.</p>
      `,
    });
  }

  async sendTemporaryPassword(input: SendTemporaryPasswordEmailInput): Promise<void> {
    await this.sendEmail({
      to: input.email,
      subject: `Your RSC ${input.role} account`,
      html: `
        <p>Hi ${this.escapeHtml(input.name)},</p>
        <p>Your RSC ${this.escapeHtml(input.role)} account has been created.</p>
        <p>Your temporary password is <strong>${this.escapeHtml(input.temporaryPassword)}</strong>.</p>
        <p>Please sign in and change it.</p>
      `,
    });
  }

  private async sendEmail(input: { to: string; subject: string; html: string }): Promise<void> {
    const body = {
      from: this.config.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(this.config.replyTo ? { reply_to: this.config.replyTo } : {}),
    };

    this.logger.log(
      `Sending Resend email: ${JSON.stringify({
        from: this.config.from,
        to: input.to,
        subject: input.subject,
      })}`,
    );

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as ResendSendResponse;

      if (!response.ok || !payload.id) {
        this.logger.error(
          `Resend rejected email: ${JSON.stringify({
            status: response.status,
            name: payload.name ?? null,
            message: payload.message ?? null,
          })}`,
        );
        throw new BadGatewayException("Unable to send email verification code");
      }
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      this.logger.error("Resend email request failed");
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
