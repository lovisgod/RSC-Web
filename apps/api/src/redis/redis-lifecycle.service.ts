import { Inject, Injectable, type OnApplicationShutdown } from "@nestjs/common";
import type Redis from "ioredis";

import { REDIS_CLIENT } from "./redis.constants";

@Injectable()
export class RedisLifecycleService implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.redis.status !== "end") {
      await this.redis.quit();
    }
  }
}
