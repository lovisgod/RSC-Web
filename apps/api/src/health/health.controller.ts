import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from "@nestjs/terminus";

import { RedisHealthIndicator } from "./redis.health";

@ApiTags("health")
@Controller({ path: "health", version: "1" })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get("live")
  @ApiOperation({ summary: "Process liveness probe" })
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Get("ready")
  @ApiOperation({ summary: "PostgreSQL and Redis readiness probe" })
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.database.pingCheck("database", { timeout: 2_000 }),
      () => this.redis.isHealthy(),
    ]);
  }
}
