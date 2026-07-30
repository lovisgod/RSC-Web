import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApplicationConfig } from "../../config/configuration";
import type {
  SendPasswordResetSmsInput,
  SendPhoneVerificationInput,
  SmsSender,
} from "./sms-sender";

interface SlingSendResponse {
  status?: string;
  status_delivery?: string;
  message_id?: string;
  details?: string;
  credit_used?: number | string;
}

@Injectable()
export class SlingSmsSender implements SmsSender {
  private readonly logger = new Logger(SlingSmsSender.name);
  private readonly config: ApplicationConfig["sms"]["sling"];

  constructor(configService: ConfigService<ApplicationConfig, true>) {
    this.config = configService.get("sms.sling", { infer: true });
  }

  async sendPhoneVerification(input: SendPhoneVerificationInput): Promise<void> {
    await this.sendSms(
      input.phone,
      `Your RSC verification code is ${input.code}. It expires in ${input.expiresInMinutes} minutes.`,
    );
  }

  async sendPasswordReset(input: SendPasswordResetSmsInput): Promise<void> {
    await this.sendSms(
      input.phone,
      `Your RSC password reset code is ${input.code}. It expires in ${input.expiresInMinutes} minutes.`,
    );
  }

  private async sendSms(phone: string, message: string): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const requestUrl = `${this.config.baseUrl}/send-sms`;

    try {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${this.config.apiToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          to: phone,
          message,
          sender: this.config.senderId,
          type: this.config.type,
        }),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as SlingSendResponse;

      if (!response.ok || payload.status !== "success" || !payload.message_id) {
        this.logger.error(
          `Sling rejected SMS request: ${JSON.stringify({
            httpStatus: response.status,
            status: payload.status ?? null,
            deliveryStatus: payload.status_delivery ?? null,
            details: payload.details ?? null,
            creditUsed: payload.credit_used ?? null,
          })}`,
        );
        throw new BadGatewayException("Unable to send verification code");
      }

      this.logger.log(
        `Sling accepted SMS for delivery: ${JSON.stringify({
          messageId: payload.message_id,
          deliveryStatus: payload.status_delivery ?? null,
        })}`,
      );
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      this.logger.error(
        `Sling SMS request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw new BadGatewayException("Unable to send verification code");
    } finally {
      clearTimeout(timeout);
    }
  }
}
