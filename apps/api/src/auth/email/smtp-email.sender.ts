import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import type { ApplicationConfig } from "../../config/configuration";
import type {
  EmailSender,
  SendPasswordResetEmailInput,
  SendWelcomeVerificationEmailInput,
} from "./email-sender";

@Injectable()
export class SmtpEmailSender implements EmailSender {
  private readonly logger = new Logger(SmtpEmailSender.name);
  private readonly config: ApplicationConfig["email"]["smtp"];
  private readonly transporter: Mail<SMTPTransport.SentMessageInfo>;

  constructor(configService: ConfigService<ApplicationConfig, true>) {
    this.config = configService.get("email.smtp", { infer: true });
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
    });
  }

  async sendWelcomeVerification(input: SendWelcomeVerificationEmailInput): Promise<void> {
    const subject = "Welcome to RSC - verify your email";
    const html = `
      <p>Hi ${this.escapeHtml(input.name)},</p>
      <p>Welcome to RSC.</p>
      <p>Your email verification code is <strong>${input.code}</strong>.</p>
      <p>It expires in ${input.expiresInMinutes} minutes.</p>
    `;

    this.logger.log(
      `Sending SMTP welcome email: ${JSON.stringify({
        host: this.config.host,
        port: this.config.port,
        from: this.config.from,
        to: input.email,
        subject,
      })}`,
    );

    try {
      const info: SMTPTransport.SentMessageInfo = await this.transporter.sendMail({
        from: this.config.from,
        to: input.email,
        subject,
        html,
      });

      this.logger.log(
        `SMTP accepted welcome email: ${JSON.stringify({ messageId: info.messageId })}`,
      );
    } catch (error) {
      this.logger.error(
        `SMTP rejected welcome email: ${JSON.stringify({ message: (error as Error).message })}`,
      );
      throw new BadGatewayException("Unable to send email verification code");
    }
  }

  async sendPasswordReset(input: SendPasswordResetEmailInput): Promise<void> {
    const subject = "Reset your RSC password";
    const html = `
      <p>Hi ${this.escapeHtml(input.name)},</p>
      <p>Your RSC password reset code is <strong>${input.code}</strong>.</p>
      <p>It expires in ${input.expiresInMinutes} minutes.</p>
    `;

    this.logger.log(
      `Sending SMTP password reset email: ${JSON.stringify({
        host: this.config.host,
        port: this.config.port,
        from: this.config.from,
        to: input.email,
        subject,
      })}`,
    );

    try {
      const info: SMTPTransport.SentMessageInfo = await this.transporter.sendMail({
        from: this.config.from,
        to: input.email,
        subject,
        html,
      });

      this.logger.log(
        `SMTP accepted password reset email: ${JSON.stringify({ messageId: info.messageId })}`,
      );
    } catch (error) {
      this.logger.error(
        `SMTP rejected password reset email: ${JSON.stringify({ message: (error as Error).message })}`,
      );
      throw new BadGatewayException("Unable to send password reset email");
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
