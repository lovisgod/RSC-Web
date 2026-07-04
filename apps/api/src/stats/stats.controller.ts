import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { OperationsStatsQueryDto, OrderPulseQueryDto } from "./dto/operations-stats.dto";
import { StatsService } from "./stats.service";

@ApiTags("Stats")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller({ path: "stats/operations", version: "1" })
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get("summary")
  @ApiMessage("Operations summary retrieved")
  @ApiOperation({
    summary: "Get operations dashboard summary",
    description:
      "Returns active outlets, open master orders, and delayed kitchen sub-orders. Payment and settlement stats are intentionally excluded.",
  })
  summary(@Req() request: AuthenticatedRequest, @Query() query: OperationsStatsQueryDto) {
    return this.stats.operationsSummary(request.user!, query);
  }

  @Get("order-pulse")
  @ApiMessage("Order pulse retrieved")
  @ApiOperation({
    summary: "Get service volume order pulse",
    description:
      "Returns order volume buckets for TODAY, LAST_7_DAYS, or LAST_30_DAYS. Supports optional outletId for super admins; outlet admins are scoped automatically.",
  })
  orderPulse(@Req() request: AuthenticatedRequest, @Query() query: OrderPulseQueryDto) {
    return this.stats.orderPulse(request.user!, query);
  }

  @Get("queue")
  @ApiMessage("Operations queue retrieved")
  @ApiOperation({
    summary: "Get operations attention queue",
    description:
      "Returns delayed kitchen ticket and paused outlet counts. Payment and settlement queue items are intentionally excluded.",
  })
  queue(@Req() request: AuthenticatedRequest, @Query() query: OperationsStatsQueryDto) {
    return this.stats.operationsQueue(request.user!, query);
  }
}
