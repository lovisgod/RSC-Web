import { BadGatewayException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApplicationConfig } from "../../config/configuration";
import { TermiiSmsSender } from "./termii-sms.sender";

function createSender(): TermiiSmsSender {
  const config = new ConfigService<ApplicationConfig, true>({
    sms: {
      provider: "termii",
      termii: {
        baseUrl: "https://api.ng.termii.com",
        apiKey: "termii-secret",
        senderId: "RSC",
        channel: "dnd",
        timeoutMs: 5_000,
      },
    },
  } as ApplicationConfig);

  return new TermiiSmsSender(config);
}

describe(TermiiSmsSender.name, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the generated OTP through the Termii messaging endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: "ok", message_id: "message-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createSender().sendPhoneVerification({
      phone: "2348031234567",
      code: "482901",
      expiresInMinutes: 10,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.ng.termii.com/api/sms/send",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: "termii-secret",
          to: "2348031234567",
          from: "RSC",
          sms: "Your RSC verification code is 482901. It expires in 10 minutes.",
          type: "plain",
          channel: "dnd",
        }),
      }),
    );
  });

  it("maps provider rejections to a safe gateway error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "invalid_request" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(
      createSender().sendPhoneVerification({
        phone: "2348031234567",
        code: "482901",
        expiresInMinutes: 10,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it("rejects incomplete success payloads without a Termii message id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "ok" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(
      createSender().sendPhoneVerification({
        phone: "2348031234567",
        code: "482901",
        expiresInMinutes: 10,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it("maps network failures to a safe gateway error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("socket failed")));

    await expect(
      createSender().sendPhoneVerification({
        phone: "2348031234567",
        code: "482901",
        expiresInMinutes: 10,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
