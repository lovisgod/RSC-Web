import { generateKeyPairSync } from "node:crypto";

import type { ConfigService } from "@nestjs/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationConfig } from "../config/configuration";
import { FirebasePushSender } from "./firebase-push.sender";

describe(FirebasePushSender.name, () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  let fetchMock: ReturnType<typeof vi.fn>;
  let sender: FirebasePushSender;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    sender = new FirebasePushSender({
      get: () => ({
        projectId: "rsc-test-project",
        clientEmail: "firebase-adminsdk@test.iam.gserviceaccount.com",
        privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
      }),
    } as unknown as ConfigService<ApplicationConfig, true>);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("authorizes with Google OAuth and sends an FCM v1 message", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "google-access-token", expires_in: 3600 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ name: "projects/rsc-test-project/messages/message-id" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

    await sender.send({
      token: "device-token",
      title: "Order status updated",
      body: "Your order is ready.",
      data: { type: "ORDER_STATUS" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://oauth2.googleapis.com/token");
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://fcm.googleapis.com/v1/projects/rsc-test-project/messages:send",
    );
    const fcmRequestInit = fetchMock.mock.calls[1]?.[1] as RequestInit;

    expect(fcmRequestInit).toMatchObject({
      method: "POST",
      headers: {
        authorization: "Bearer google-access-token",
        "content-type": "application/json",
      },
    });

    const body = JSON.parse(fcmRequestInit.body as string) as {
      message: {
        token: string;
        notification: { title: string; body: string };
        data: Record<string, string>;
      };
    };

    expect(body).toEqual({
      message: {
        token: "device-token",
        notification: {
          title: "Order status updated",
          body: "Your order is ready.",
        },
        data: { type: "ORDER_STATUS" },
      },
    });
  });
});
