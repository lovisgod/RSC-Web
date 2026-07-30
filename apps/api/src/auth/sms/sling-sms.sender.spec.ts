import { BadGatewayException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApplicationConfig } from "../../config/configuration";
import { SlingSmsSender } from "./sling-sms.sender";

function createSender(): SlingSmsSender {
  const config = new ConfigService<ApplicationConfig, true>({
    sms: {
      provider: "sling",
      sling: {
        baseUrl: "https://app.sling.com.ng/api/v1",
        apiToken: "sling-secret-token",
        senderId: "RSCApp",
        type: "transactional",
        timeoutMs: 5_000,
      },
    },
  } as ApplicationConfig);

  return new SlingSmsSender(config);
}

describe(SlingSmsSender.name, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a phone verification code through Sling", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "success",
          status_delivery: "pending",
          message_id: "message-1",
          credit_used: 1,
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createSender().sendPhoneVerification({
      phone: "2348031234567",
      code: "482901",
      expiresInMinutes: 10,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.sling.com.ng/api/v1/send-sms",
      expect.objectContaining({
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: "Bearer sling-secret-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          to: "2348031234567",
          message: "Your RSC verification code is 482901. It expires in 10 minutes.",
          sender: "RSCApp",
          type: "transactional",
        }),
      }),
    );
  });

  it("sends password reset codes through Sling", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "success", message_id: "message-2" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createSender().sendPasswordReset({
      phone: "2348031234567",
      code: "193745",
      expiresInMinutes: 10,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.sling.com.ng/api/v1/send-sms",
      expect.objectContaining({
        body: JSON.stringify({
          to: "2348031234567",
          message: "Your RSC password reset code is 193745. It expires in 10 minutes.",
          sender: "RSCApp",
          type: "transactional",
        }),
      }),
    );
  });

  it("maps Sling error responses to a safe gateway error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "fail",
            credit_used: "0",
            details: "insufficient credit",
          }),
          {
            status: 400,
            headers: { "content-type": "application/json" },
          },
        ),
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

  it("rejects incomplete success responses without a message id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "success" }), {
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
