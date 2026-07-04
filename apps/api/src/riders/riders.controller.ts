import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { RecordRiderLocationDto, RiderDeliveriesQueryDto } from "./dto/rider-location.dto";
import { RidersService } from "./riders.service";

@ApiTags("Riders")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: "riders", version: "1" })
export class RidersController {
  constructor(private readonly riders: RidersService) {}

  @Post("locations")
  @ApiMessage("Rider location recorded")
  @ApiOperation({
    summary: "Record rider location",
    description:
      "Rider-only endpoint for posting the rider's current latitude and longitude. Include masterOrderId when the location update belongs to an active delivery so customers and admins can track the assigned rider.",
  })
  recordLocation(@Req() request: AuthenticatedRequest, @Body() input: RecordRiderLocationDto) {
    return this.riders.recordLocation(request.user!, input);
  }

  @Get("locations")
  @ApiMessage("Rider locations retrieved")
  @ApiOperation({
    summary: "List my rider locations",
    description:
      "Rider-only endpoint that returns the authenticated rider's recorded location history, newest first.",
  })
  listMine(@Req() request: AuthenticatedRequest) {
    return this.riders.listMine(request.user!);
  }

  @Get("me/deliveries")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @ApiMessage("Rider completed deliveries retrieved")
  @ApiOperation({
    summary: "List my completed deliveries",
    description:
      "Rider-only endpoint that returns completed deliveries for the authenticated rider. Supports optional date range, payout status, delivery mode, and pagination filters.",
  })
  completedDeliveries(
    @Req() request: AuthenticatedRequest,
    @Query() query: RiderDeliveriesQueryDto,
  ) {
    return this.riders.completedDeliveries(request.user!, query);
  }
}
