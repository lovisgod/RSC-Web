import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApplicationConfig } from "../../config/configuration";
import type { SendPhoneVerificationInput, SmsSender } from "./sms-sender";

interface TermiiSendResponse {
  code?: string;
  message?: string;
  message_id?: string;
}

@Injectable()
export class TermiiSmsSender implements SmsSender {
  private readonly logger = new Logger(TermiiSmsSender.name);
  private readonly config: ApplicationConfig["sms"]["termii"];

  constructor(configService: ConfigService<ApplicationConfig, true>) {
    this.config = configService.get("sms.termii", { infer: true });
  }

  async sendPhoneVerification(input: SendPhoneVerificationInput): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/api/sms/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: this.config.apiKey,
          to: input.phone,
          from: this.config.senderId,
          sms: `Your RSC verification code is ${input.code}. It expires in ${input.expiresInMinutes} minutes.`,
          type: "plain",
          channel: this.config.channel,
        }),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as TermiiSendResponse;

      if (!response.ok || payload.code !== "ok") {
        this.logger.error(`Termii rejected SMS request with status ${response.status}`);
        throw new BadGatewayException("Unable to send verification code");
      }
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      this.logger.error("Termii SMS request failed");
      throw new BadGatewayException("Unable to send verification code");
    } finally {
      clearTimeout(timeout);
    }
  }
}
