import { createHmac, randomInt } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type Redis from "ioredis";

import type { ApplicationConfig } from "../../config/configuration";
import { REDIS_CLIENT } from "../../redis/redis.constants";
import { OTP_MAX_ATTEMPTS, OTP_TTL_SECONDS } from "./otp.constants";

export type OtpVerificationResult = "VERIFIED" | "INVALID" | "EXPIRED";

interface StoredOtp {
  hash: string;
  attemptsRemaining: number;
}

const VERIFY_OTP_SCRIPT = `
local value = redis.call("GET", KEYS[1])
if not value then
  return "EXPIRED"
end

local otp = cjson.decode(value)
if otp.hash == ARGV[1] then
  redis.call("DEL", KEYS[1])
  return "VERIFIED"
end

otp.attemptsRemaining = otp.attemptsRemaining - 1
if otp.attemptsRemaining <= 0 then
  redis.call("DEL", KEYS[1])
else
  local ttl = redis.call("TTL", KEYS[1])
  if ttl > 0 then
    redis.call("SET", KEYS[1], cjson.encode(otp), "EX", ttl)
  else
    redis.call("DEL", KEYS[1])
  end
end

return "INVALID"
`;

@Injectable()
export class PhoneOtpService {
  private readonly otpPepper: string;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    configService: ConfigService<ApplicationConfig, true>,
  ) {
    this.otpPepper = configService.get("security.otpPepper", { infer: true });
  }

  generateCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
  }

  async store(customerId: string, code: string): Promise<void> {
    await this.storeWithKey(this.key(customerId), customerId, code);
  }

  async storeEmail(customerId: string, code: string): Promise<void> {
    await this.storeWithKey(this.emailKey(customerId), customerId, code);
  }

  private async storeWithKey(key: string, customerId: string, code: string): Promise<void> {
    const value: StoredOtp = {
      hash: this.hash(customerId, code),
      attemptsRemaining: OTP_MAX_ATTEMPTS,
    };

    await this.redis.set(key, JSON.stringify(value), "EX", OTP_TTL_SECONDS);
  }

  async revoke(customerId: string): Promise<void> {
    await this.redis.del(this.key(customerId));
  }

  async revokeEmail(customerId: string): Promise<void> {
    await this.redis.del(this.emailKey(customerId));
  }

  async verify(customerId: string, code: string): Promise<OtpVerificationResult> {
    return this.verifyWithKey(this.key(customerId), customerId, code);
  }

  async verifyEmail(customerId: string, code: string): Promise<OtpVerificationResult> {
    return this.verifyWithKey(this.emailKey(customerId), customerId, code);
  }

  private async verifyWithKey(
    key: string,
    customerId: string,
    code: string,
  ): Promise<OtpVerificationResult> {
    const result: unknown = await this.redis.eval(
      VERIFY_OTP_SCRIPT,
      1,
      key,
      this.hash(customerId, code),
    );

    if (result === "VERIFIED" || result === "INVALID" || result === "EXPIRED") {
      return result;
    }

    throw new Error("Unexpected OTP verification result");
  }

  private hash(customerId: string, code: string): string {
    return createHmac("sha256", this.otpPepper)
      .update(customerId)
      .update("\0")
      .update(code)
      .digest("hex");
  }

  private key(customerId: string): string {
    return `auth:phone-otp:${customerId}`;
  }

  private emailKey(customerId: string): string {
    return `auth:email-otp:${customerId}`;
  }
}
