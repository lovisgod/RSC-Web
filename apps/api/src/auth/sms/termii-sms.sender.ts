import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApplicationConfig } from "../../config/configuration";
import type { SendPhoneVerificationInput, SmsSender } from "./sms-sender";

interface TermiiSendResponse {
  code?: string | number;
  message?: string;
  message_id?: string;
  link?: string;
}

@Injectable()
export class TermiiSmsSender implements SmsSender {
  private readonly logger = new Logger(TermiiSmsSender.name);
  private readonly config: ApplicationConfig["sms"]["termii"];

  constructor(configService: ConfigService<ApplicationConfig, true>) {
    this.config = configService.get("sms.termii", { infer: true });
  }

  private describePayload(payload: TermiiSendResponse): string {
    const summary = {
      code: payload.code ?? null,
      message: payload.message ?? null,
      link: payload.link ?? null,
    };

    return JSON.stringify(summary);
  }

  private maskApiKey(value: string): string {
    if (value.length <= 8) {
      return "<set>";
    }

    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }

  private maskPhone(value: string): string {
    if (value.length <= 7) {
      return value;
    }

    return `${value.slice(0, 3)}${"*".repeat(Math.max(0, value.length - 7))}${value.slice(-4)}`;
  }

  async sendPhoneVerification(input: SendPhoneVerificationInput): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const requestUrl = `${this.config.baseUrl}/api/sms/send`;
    const requestBody = {
      api_key: this.config.apiKey,
      to: input.phone,
      from: this.config.senderId,
      sms: `Your RSC verification code is ${input.code}. It expires in ${input.expiresInMinutes} minutes.`,
      type: "plain" as const,
      channel: this.config.channel,
    };

    try {
      this.logger.log(
        `Sending Termii SMS request: ${JSON.stringify({
          url: requestUrl,
          body: {
            ...requestBody,
            api_key: this.maskApiKey(requestBody.api_key),
            to: this.maskPhone(requestBody.to),
          },
        })}`,
      );

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as TermiiSendResponse;

      if (!response.ok) {
        this.logger.error(
          `Termii rejected SMS request with status ${response.status}: ${this.describePayload(payload)}`,
        );
        throw new BadGatewayException("Unable to send verification code");
      }

      if (payload.code !== "ok" || !payload.message_id) {
        this.logger.error(
          `Termii rejected SMS request with status ${response.status}: ${this.describePayload(payload)}`,
        );
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
