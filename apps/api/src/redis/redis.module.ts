import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import type { ApplicationConfig } from "../config/configuration";
import { REDIS_CLIENT } from "./redis.constants";
import { RedisLifecycleService } from "./redis-lifecycle.service";

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ApplicationConfig, true>) => {
        const { url } = configService.get("redis", { infer: true });

        const client = new Redis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableReadyCheck: true,
        });

        client.on("error", (err) => {
          // Prevent crashes due to connection failures
          console.error(`[Redis Client Error] ${err.message}`);
        });

        return client;
      },
    },
    RedisLifecycleService,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
