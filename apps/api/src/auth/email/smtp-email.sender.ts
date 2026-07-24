import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import type { ApplicationConfig } from "../../config/configuration";
import type {
  EmailSender,
  SendDatabaseBackupEmailInput,
  SendMarketingEmailInput,
  SendPasswordResetEmailInput,
  SendTemporaryPasswordEmailInput,
  SendWelcomeVerificationEmailInput,
} from "./email-sender";
import { renderEmailTemplate } from "./email-template";

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
    const html = renderEmailTemplate({
      preheader: `Your verification code expires in ${input.expiresInMinutes} minutes.`,
      heading: "Verify your email",
      greetingName: input.name,
      intro: "Welcome to RSC. Use the verification code below to finish setting up your account.",
      codeLabel: "Verification code",
      code: input.code,
      body: `This code expires in ${input.expiresInMinutes} minutes.`,
    });

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
    const html = renderEmailTemplate({
      preheader: `Your password reset code expires in ${input.expiresInMinutes} minutes.`,
      heading: "Reset your password",
      greetingName: input.name,
      intro: "Use the code below to reset your RSC password.",
      codeLabel: "Password reset code",
      code: input.code,
      body: `This code expires in ${input.expiresInMinutes} minutes.`,
    });

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

  async sendTemporaryPassword(input: SendTemporaryPasswordEmailInput): Promise<void> {
    const subject = `Your RSC ${input.role} account`;
    const html = renderEmailTemplate({
      preheader: `Your RSC ${input.role} account is ready.`,
      heading: "Your account is ready",
      greetingName: input.name,
      intro: `Your RSC ${input.role} account has been created. Use this temporary password to sign in.`,
      codeLabel: "Temporary password",
      code: input.temporaryPassword,
      body: "Please change this password after your first sign in.",
    });

    this.logger.log(
      `Sending SMTP temporary password email: ${JSON.stringify({
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
        `SMTP accepted temporary password email: ${JSON.stringify({ messageId: info.messageId })}`,
      );
    } catch (error) {
      this.logger.error(
        `SMTP rejected temporary password email: ${JSON.stringify({ message: (error as Error).message })}`,
      );
      throw new BadGatewayException("Unable to send temporary password email");
    }
  }

  async sendMarketing(input: SendMarketingEmailInput): Promise<void> {
    const html = renderEmailTemplate({
      preheader: input.preheader ?? input.body,
      heading: input.title,
      greetingName: input.name,
      intro: input.body,
      footerNote:
        "You are receiving this because promotional notifications are enabled on your RSC account.",
    });

    this.logger.log(
      `Sending SMTP marketing email: ${JSON.stringify({
        host: this.config.host,
        port: this.config.port,
        from: this.config.from,
        to: input.email,
        subject: input.subject,
      })}`,
    );

    try {
      const info: SMTPTransport.SentMessageInfo = await this.transporter.sendMail({
        from: this.config.from,
        to: input.email,
        subject: input.subject,
        html,
      });

      this.logger.log(
        `SMTP accepted marketing email: ${JSON.stringify({ messageId: info.messageId })}`,
      );
    } catch (error) {
      this.logger.error(
        `SMTP rejected marketing email: ${JSON.stringify({ message: (error as Error).message })}`,
      );
      throw new BadGatewayException("Unable to send marketing email");
    }
  }

  async sendDatabaseBackup(input: SendDatabaseBackupEmailInput): Promise<void> {
    const subject = `RSC database backup - ${input.createdAt.toISOString()}`;
    const html = renderEmailTemplate({
      preheader: "Your requested RSC database backup is attached.",
      heading: "Database backup ready",
      greetingName: "Owner",
      intro: "The latest RSC database backup has been generated and attached to this email.",
      body: `File: ${input.fileName}. Size: ${formatBytes(input.fileSizeBytes)}.`,
      footerNote: "Store this backup securely and avoid forwarding it over unsecured channels.",
    });

    this.logger.log(
      `Sending SMTP database backup email: ${JSON.stringify({
        host: this.config.host,
        port: this.config.port,
        from: this.config.from,
        to: input.email,
        subject,
        fileName: input.fileName,
      })}`,
    );

    try {
      const info: SMTPTransport.SentMessageInfo = await this.transporter.sendMail({
        from: this.config.from,
        to: input.email,
        subject,
        html,
        attachments: [{ filename: input.fileName, path: input.filePath }],
      });

      this.logger.log(
        `SMTP accepted database backup email: ${JSON.stringify({ messageId: info.messageId })}`,
      );
    } catch (error) {
      this.logger.error(
        `SMTP rejected database backup email: ${JSON.stringify({ message: (error as Error).message })}`,
      );
      throw new BadGatewayException("Unable to send database backup email");
    }
  }
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} bytes`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
