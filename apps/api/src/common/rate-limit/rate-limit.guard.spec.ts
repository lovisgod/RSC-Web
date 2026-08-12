import { HttpException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RateLimitGuard } from "./rate-limit.guard";
import { RATE_LIMIT_POLICY, SKIP_RATE_LIMIT } from "./rate-limit.decorator";

describe(RateLimitGuard.name, () => {
  const redis = {
    incr: vi.fn<(key: string) => Promise<number>>(),
    expire: vi.fn<(key: string, seconds: number) => Promise<number>>(),
    ttl: vi.fn<(key: string) => Promise<number>>(),
  };
  const setHeader = vi.fn();
  const reflector = new Reflector();
  const response = {
    setHeader,
  } as unknown as Response;
  const handler = vi.fn();
  class TestController {}

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);
    redis.ttl.mockResolvedValue(60);
  });

  it("allows requests within the configured limit and records rate-limit headers", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((metadataKey) => {
      if (metadataKey === RATE_LIMIT_POLICY) {
        return { limit: 2, windowSeconds: 60 };
      }

      return undefined;
    });

    const guard = new RateLimitGuard(reflector, redis as never);

    await expect(guard.canActivate(context())).resolves.toBe(true);

    expect(redis.incr).toHaveBeenCalledOnce();
    expect(redis.expire).toHaveBeenCalledWith(expect.stringMatching(/^rate-limit:/), 60);
    expect(setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "2");
    expect(setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "1");
    expect(setHeader).toHaveBeenCalledWith("X-RateLimit-Reset", "60");
  });

  it("rejects requests over the configured limit with retry metadata", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((metadataKey) => {
      if (metadataKey === RATE_LIMIT_POLICY) {
        return { limit: 1, windowSeconds: 60 };
      }

      return undefined;
    });
    redis.incr.mockResolvedValue(2);
    redis.ttl.mockResolvedValue(42);
    const guard = new RateLimitGuard(reflector, redis as never);

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(HttpException);

    await guard.canActivate(context()).catch((error: unknown) => {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
      expect((error as HttpException).message).toBe("Too many requests. Please try again shortly.");
    });

    expect(setHeader).toHaveBeenCalledWith("Retry-After", "42");
    expect(setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "0");
  });

  it("skips Redis when the route opts out of rate limiting", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((metadataKey) =>
      metadataKey === SKIP_RATE_LIMIT ? true : undefined,
    );
    const guard = new RateLimitGuard(reflector, redis as never);

    await expect(guard.canActivate(context())).resolves.toBe(true);

    expect(redis.incr).not.toHaveBeenCalled();
  });

  it("uses request identifiers for sensitive auth-style buckets", async () => {
    vi.spyOn(reflector, "getAllAndOverride").mockImplementation((metadataKey) => {
      if (metadataKey === RATE_LIMIT_POLICY) {
        return { limit: 10, windowSeconds: 300, keyBy: "ip-and-identifier" };
      }

      return undefined;
    });
    const guard = new RateLimitGuard(reflector, redis as never);

    await guard.canActivate(context({ body: { identifier: "Ada@Example.com" } }));
    await guard.canActivate(context({ body: { identifier: "Ben@Example.com" } }));

    const firstKey = redis.incr.mock.calls[0]?.[0];
    const secondKey = redis.incr.mock.calls[1]?.[0];

    expect(firstKey).toMatch(/^rate-limit:/);
    expect(secondKey).toMatch(/^rate-limit:/);
    expect(firstKey).not.toBe(secondKey);
  });

  function context(overrides: Partial<Request> = {}): ExecutionContext {
    const request = {
      method: "POST",
      baseUrl: "/api/v1/auth",
      path: "/login",
      route: { path: "/login" },
      headers: { "x-forwarded-for": "203.0.113.4" },
      socket: { remoteAddress: "127.0.0.1" },
      body: {},
      ...overrides,
    } as unknown as Request;

    return {
      getHandler: () => handler,
      getClass: () => TestController,
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  }
});
