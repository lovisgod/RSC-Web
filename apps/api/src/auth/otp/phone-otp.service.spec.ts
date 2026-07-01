import type { ConfigService } from "@nestjs/config";
import type Redis from "ioredis";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationConfig } from "../../config/configuration";
import { OTP_MAX_ATTEMPTS, OTP_TTL_SECONDS } from "./otp.constants";
import { PhoneOtpService } from "./phone-otp.service";

describe(PhoneOtpService.name, () => {
  const customerId = "2abf9577-027c-4936-83a8-e004fd56a46e";
  let redis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    eval: ReturnType<typeof vi.fn>;
  };
  let service: PhoneOtpService;

  beforeEach(() => {
    redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
      eval: vi.fn(),
    };
    const config = {
      get: () => "otp-pepper-that-is-at-least-32-characters",
    } as unknown as ConfigService<ApplicationConfig, true>;

    service = new PhoneOtpService(redis as unknown as Redis, config);
  });

  it("generates exactly six numeric digits", () => {
    for (let index = 0; index < 50; index += 1) {
      expect(service.generateCode()).toMatch(/^\d{6}$/);
    }
  });

  it("stores only a hash with a ten-minute TTL and bounded attempts", async () => {
    await service.store(customerId, "482901");

    expect(redis.set).toHaveBeenCalledOnce();
    const [key, serialized, expiryMode, ttl] = redis.set.mock.calls[0] as [
      string,
      string,
      string,
      number,
    ];
    const stored = JSON.parse(serialized) as {
      hash: string;
      attemptsRemaining: number;
    };

    expect(key).toBe(`auth:phone-otp:${customerId}`);
    expect(expiryMode).toBe("EX");
    expect(ttl).toBe(OTP_TTL_SECONDS);
    expect(stored.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.hash).not.toContain("482901");
    expect(stored.attemptsRemaining).toBe(OTP_MAX_ATTEMPTS);
  });

  it.each(["VERIFIED", "INVALID", "EXPIRED"] as const)(
    "returns the atomic Redis result %s",
    async (result) => {
      redis.eval.mockResolvedValue(result);

      await expect(service.verify(customerId, "482901")).resolves.toBe(result);
      expect(redis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        `auth:phone-otp:${customerId}`,
        expect.stringMatching(/^[a-f0-9]{64}$/),
      );
    },
  );

  it("revokes an outstanding OTP", async () => {
    await service.revoke(customerId);

    expect(redis.del).toHaveBeenCalledWith(`auth:phone-otp:${customerId}`);
  });

  it("stores and verifies email OTPs on a separate Redis key", async () => {
    redis.eval.mockResolvedValue("VERIFIED");

    await service.storeEmail(customerId, "193847");
    await expect(service.verifyEmail(customerId, "193847")).resolves.toBe("VERIFIED");
    await service.revokeEmail(customerId);

    expect(redis.set).toHaveBeenCalledWith(
      `auth:email-otp:${customerId}`,
      expect.any(String),
      "EX",
      OTP_TTL_SECONDS,
    );
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      `auth:email-otp:${customerId}`,
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(redis.del).toHaveBeenCalledWith(`auth:email-otp:${customerId}`);
  });

  it("stores a registration code index and verifies the channel from code only", async () => {
    await service.storeRegistrationEmail(customerId, "193847");

    const indexSetCall = redis.set.mock.calls.find(([key]) =>
      String(key).startsWith("auth:registration-otp-code:"),
    );
    expect(indexSetCall).toBeDefined();
    redis.get.mockResolvedValue(indexSetCall?.[1]);
    redis.eval.mockResolvedValue("VERIFIED");

    await expect(service.verifyRegistrationCode("193847")).resolves.toEqual({
      result: "VERIFIED",
      customerId,
      channel: "email",
    });
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      `auth:email-otp:${customerId}`,
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(redis.del).toHaveBeenCalledWith(indexSetCall?.[0]);
  });

  it("stores a profile-change code index and verifies the channel from code only", async () => {
    await service.storeProfileChangePhone(customerId, "482901");

    const indexSetCall = redis.set.mock.calls.find(([key]) =>
      String(key).startsWith("auth:profile-change-otp-code:"),
    );
    expect(indexSetCall).toBeDefined();
    redis.get.mockResolvedValue(indexSetCall?.[1]);
    redis.eval.mockResolvedValue("VERIFIED");

    await expect(service.verifyProfileChangeCode("482901")).resolves.toEqual({
      result: "VERIFIED",
      customerId,
      channel: "phone",
    });
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      `auth:phone-otp:${customerId}`,
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(redis.del).toHaveBeenCalledWith(indexSetCall?.[0]);
  });
});
