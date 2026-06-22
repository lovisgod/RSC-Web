import { Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from "@nestjs/terminus";

import { REDIS_CLIENT } from "../redis/redis.constants";

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key = "redis"): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);

    try {
      if (this.redis.status === "wait") {
        await this.redis.connect();
      }

      const response = await this.redis.ping();

      return response === "PONG"
        ? indicator.up()
        : indicator.down({ response });
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : "Redis check failed",
      });
    }
  }
}
