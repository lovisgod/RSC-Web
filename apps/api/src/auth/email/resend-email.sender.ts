import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApplicationConfig } from "../../config/configuration";
import type {
  EmailSender,
  SendMarketingEmailInput,
  SendPasswordResetEmailInput,
  SendTemporaryPasswordEmailInput,
  SendWelcomeVerificationEmailInput,
} from "./email-sender";
import { renderEmailTemplate } from "./email-template";

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
      html: renderEmailTemplate({
        preheader: `Your verification code expires in ${input.expiresInMinutes} minutes.`,
        heading: "Verify your email",
        greetingName: input.name,
        intro: "Welcome to RSC. Use the verification code below to finish setting up your account.",
        codeLabel: "Verification code",
        code: input.code,
        body: `This code expires in ${input.expiresInMinutes} minutes.`,
      }),
    });
  }

  async sendPasswordReset(input: SendPasswordResetEmailInput): Promise<void> {
    await this.sendEmail({
      to: input.email,
      subject: "Reset your RSC password",
      html: renderEmailTemplate({
        preheader: `Your password reset code expires in ${input.expiresInMinutes} minutes.`,
        heading: "Reset your password",
        greetingName: input.name,
        intro: "Use the code below to reset your RSC password.",
        codeLabel: "Password reset code",
        code: input.code,
        body: `This code expires in ${input.expiresInMinutes} minutes.`,
      }),
    });
  }

  async sendTemporaryPassword(input: SendTemporaryPasswordEmailInput): Promise<void> {
    await this.sendEmail({
      to: input.email,
      subject: `Your RSC ${input.role} account`,
      html: renderEmailTemplate({
        preheader: `Your RSC ${input.role} account is ready.`,
        heading: "Your account is ready",
        greetingName: input.name,
        intro: `Your RSC ${input.role} account has been created. Use this temporary password to sign in.`,
        codeLabel: "Temporary password",
        code: input.temporaryPassword,
        body: "Please change this password after your first sign in.",
      }),
    });
  }

  async sendMarketing(input: SendMarketingEmailInput): Promise<void> {
    await this.sendEmail({
      to: input.email,
      subject: input.subject,
      html: renderEmailTemplate({
        preheader: input.preheader ?? input.body,
        heading: input.title,
        greetingName: input.name,
        intro: input.body,
        footerNote:
          "You are receiving this because promotional notifications are enabled on your RSC account.",
      }),
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
}
