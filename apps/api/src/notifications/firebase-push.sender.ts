import { createSign } from "node:crypto";

import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApplicationConfig } from "../config/configuration";
import type { PushNotificationInput, PushSender } from "./push-sender";

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface FirebaseSendResponse {
  name?: string;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

@Injectable()
export class FirebasePushSender implements PushSender {
  private readonly logger = new Logger(FirebasePushSender.name);
  private readonly projectId: string;
  private readonly clientEmail: string;
  private readonly privateKey: string;
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(configService: ConfigService<ApplicationConfig, true>) {
    const firebase = configService.get("push.firebase", { infer: true });

    this.projectId = firebase.projectId;
    this.clientEmail = firebase.clientEmail;
    this.privateKey = firebase.privateKey;
  }

  async send(input: PushNotificationInput): Promise<void> {
    const token = await this.getAccessToken();
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: input.token,
            notification: {
              title: input.title,
              body: input.body,
            },
            data: input.data ?? {},
          },
        }),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as FirebaseSendResponse;

    if (!response.ok || !payload.name) {
      this.logger.error(
        `Firebase rejected push notification: ${JSON.stringify({
          status: response.status,
          code: payload.error?.code ?? null,
          message: payload.error?.message ?? null,
        })}`,
      );
      throw new BadGatewayException("Unable to send push notification");
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1_000);

    if (this.accessToken && this.accessTokenExpiresAt - 60 > now) {
      return this.accessToken;
    }

    const assertion = this.createAssertion(now);
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as GoogleTokenResponse;

    if (!response.ok || !payload.access_token) {
      this.logger.error(
        `Google OAuth rejected Firebase token request: ${JSON.stringify({
          status: response.status,
          error: payload.error ?? null,
          description: payload.error_description ?? null,
        })}`,
      );
      throw new BadGatewayException("Unable to authorize Firebase push notifications");
    }

    this.accessToken = payload.access_token;
    this.accessTokenExpiresAt = now + (payload.expires_in ?? 3_600);

    return this.accessToken;
  }

  private createAssertion(now: number): string {
    const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
    const claims = base64UrlJson({
      iss: this.clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3_600,
    });
    const unsignedToken = `${header}.${claims}`;
    const signature = createSign("RSA-SHA256").update(unsignedToken).sign(this.privateKey);

    return `${unsignedToken}.${signature.toString("base64url")}`;
  }
}

function base64UrlJson(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
