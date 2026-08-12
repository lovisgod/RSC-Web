import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_POLICY = Symbol("RATE_LIMIT_POLICY");
export const SKIP_RATE_LIMIT = Symbol("SKIP_RATE_LIMIT");

export type RateLimitKeyBy = "ip" | "ip-and-identifier";

export interface RateLimitPolicy {
  limit: number;
  windowSeconds: number;
  keyBy?: RateLimitKeyBy;
}

export const RateLimit = (policy: RateLimitPolicy) => SetMetadata(RATE_LIMIT_POLICY, policy);

export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT, true);
