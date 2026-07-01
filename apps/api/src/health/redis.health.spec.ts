import { HealthIndicatorService } from "@nestjs/terminus";
import type Redis from "ioredis";
import { describe, expect, it, vi } from "vitest";

import { RedisHealthIndicator } from "./redis.health";

describe(RedisHealthIndicator.name, () => {
  it("reconnects a closed lazy Redis client before pinging", async () => {
    const redis = {
      status: "close",
      connect: vi.fn().mockImplementation(function connect(this: { status: string }) {
        this.status = "ready";
        return Promise.resolve();
      }),
      ping: vi.fn().mockResolvedValue("PONG"),
    };
    const indicator = new RedisHealthIndicator(
      redis as unknown as Redis,
      new HealthIndicatorService(),
    );

    await expect(indicator.isHealthy()).resolves.toEqual({ redis: { status: "up" } });

    expect(redis.connect).toHaveBeenCalledOnce();
    expect(redis.ping).toHaveBeenCalledOnce();
  });

  it("returns a down indicator when Redis cannot be reached", async () => {
    const redis = {
      status: "wait",
      connect: vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:6379")),
      ping: vi.fn(),
    };
    const indicator = new RedisHealthIndicator(
      redis as unknown as Redis,
      new HealthIndicatorService(),
    );

    await expect(indicator.isHealthy()).resolves.toEqual({
      redis: {
        status: "down",
        message: "connect ECONNREFUSED 127.0.0.1:6379",
      },
    });

    expect(redis.ping).not.toHaveBeenCalled();
  });
});
