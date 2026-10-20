import type { ConfigService } from "@nestjs/config";

import type { ApplicationConfig } from "../../config/configuration";
import type { EmailSender } from "./email-sender";
import { NoopEmailSender } from "./noop-email.sender";
import { ResendEmailSender } from "./resend-email.sender";
import { SmtpEmailSender } from "./smtp-email.sender";

export function createEmailSenderFromEnv(): EmailSender {
  const provider = process.env.EMAIL_PROVIDER ?? "noop";

  const configService = {
    get: (key: string) => {
      if (key === "email.provider") {
        return provider;
      }
      if (key === "email.smtp") {
        return {
          host: process.env.SMTP_HOST ?? "smtp.gmail.com",
          port: Number(process.env.SMTP_PORT ?? 587),
          secure: process.env.SMTP_SECURE === "true",
          user: process.env.SMTP_USER ?? "",
          pass: process.env.SMTP_PASS ?? "",
          from: process.env.SMTP_FROM ?? "DineOut NG <noreply@dineout.ng>",
        };
      }
      if (key === "email.resend") {
        return {
          apiKey: process.env.RESEND_API_KEY ?? "",
          from: process.env.RESEND_FROM ?? "DineOut NG <onboarding@resend.dev>",
          replyTo: process.env.RESEND_REPLY_TO ?? "",
        };
      }
      return null;
    },
  } as unknown as ConfigService<ApplicationConfig, true>;

  if (provider === "smtp") {
    return new SmtpEmailSender(configService);
  }

  if (provider === "resend") {
    return new ResendEmailSender(configService);
  }

  return new NoopEmailSender();
}
