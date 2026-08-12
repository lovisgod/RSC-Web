import { createHash } from "node:crypto";

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import Redis from "ioredis";

import { REDIS_CLIENT } from "../../redis/redis.constants";
import {
  RATE_LIMIT_POLICY,
  SKIP_RATE_LIMIT,
  type RateLimitKeyBy,
  type RateLimitPolicy,
} from "./rate-limit.decorator";

const DEFAULT_POLICY: RateLimitPolicy = {
  limit: 180,
  windowSeconds: 60,
  keyBy: "ip",
};

interface RateLimitState {
  count: number;
  ttlSeconds: number;
}

type RateLimitedRequest = Omit<Request, "body" | "route"> & {
  body?: unknown;
  route?: {
    path?: unknown;
  };
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return true;
    }

    const policy =
      this.reflector.getAllAndOverride<RateLimitPolicy>(RATE_LIMIT_POLICY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_POLICY;
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const key = this.buildKey(request, policy.keyBy ?? "ip");
    const state = await this.consume(key, policy.windowSeconds);

    response.setHeader("X-RateLimit-Limit", String(policy.limit));
    response.setHeader("X-RateLimit-Remaining", String(Math.max(policy.limit - state.count, 0)));
    response.setHeader("X-RateLimit-Reset", String(state.ttlSeconds));

    if (state.count > policy.limit) {
      response.setHeader("Retry-After", String(state.ttlSeconds));
      throw new HttpException(
        "Too many requests. Please try again shortly.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private async consume(key: string, windowSeconds: number): Promise<RateLimitState> {
    try {
      const count = await this.redis.incr(key);

      if (count === 1) {
        await this.redis.expire(key, windowSeconds);
      }

      const ttl = await this.redis.ttl(key);

      return {
        count,
        ttlSeconds: ttl > 0 ? ttl : windowSeconds,
      };
    } catch {
      throw new ServiceUnavailableException("Rate limiting is temporarily unavailable");
    }
  }

  private buildKey(request: Request, keyBy: RateLimitKeyBy): string {
    const route = this.routeId(request);
    const identity =
      keyBy === "ip-and-identifier"
        ? `${this.clientIp(request)}:${this.requestIdentifier(request)}`
        : this.clientIp(request);

    return `rate-limit:${route}:${hash(identity)}`;
  }

  private routeId(request: Request): string {
    const route = (request as RateLimitedRequest).route;
    const routePath = typeof route?.path === "string" ? route.path : request.path;
    const baseUrl = request.baseUrl || "";

    return `${request.method}:${baseUrl}${routePath}`.toLowerCase();
  }

  private clientIp(request: Request): string {
    const forwardedFor = request.headers["x-forwarded-for"];
    const firstForwardedFor = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const forwardedIp = firstForwardedFor?.split(",")[0]?.trim();

    return forwardedIp || request.ip || request.socket.remoteAddress || "unknown";
  }

  private requestIdentifier(request: Request): string {
    const body = (request as RateLimitedRequest).body;

    if (!isRecord(body)) {
      return "anonymous";
    }

    for (const field of ["identifier", "email", "phone", "code"]) {
      const value = body[field];

      if (typeof value === "string" && value.trim()) {
        return value.trim().toLowerCase();
      }
    }

    return "anonymous";
  }
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
