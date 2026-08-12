import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from "@nestjs/terminus";

import { ApiMessage } from "../common/http/api-message.decorator";
import { SkipRateLimit } from "../common/rate-limit/rate-limit.decorator";
import { RedisHealthIndicator } from "./redis.health";

@ApiTags("health")
@SkipRateLimit()
@Controller({ path: "health", version: "1" })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get("live")
  @ApiMessage("API is live")
  @ApiOperation({ summary: "Process liveness probe" })
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Get("ready")
  @ApiMessage("API dependencies are ready")
  @ApiOperation({ summary: "PostgreSQL and Redis readiness probe" })
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.database.pingCheck("database", { timeout: 2_000 }),
      () => this.redis.isHealthy(),
    ]);
  }
}
