import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { RejectAssignedOrderDto } from "../orders/dto/orders.dto";
import { OrdersService } from "../orders/orders.service";
import { RecordRiderLocationDto, RiderDeliveriesQueryDto } from "./dto/rider-location.dto";
import { RidersService } from "./riders.service";

@ApiTags("Riders")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: "riders", version: "1" })
export class RidersController {
  constructor(
    private readonly riders: RidersService,
    private readonly orders: OrdersService,
  ) {}

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

  @Get("me/assigned-orders")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @ApiMessage("Rider assigned orders retrieved")
  @ApiOperation({
    summary: "List my assigned active orders",
    description:
      "Rider-only endpoint returning active auto-assigned dispatches. Assignment is accepted by default until the rider explicitly rejects an order.",
  })
  assignedOrders(@Req() request: AuthenticatedRequest) {
    return this.orders.listAssignedDispatches(request.user!);
  }

  @Patch("me/assigned-orders/:id/reject")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @ApiMessage("Rider order assignment rejected")
  @ApiOperation({
    summary: "Reject an assigned order",
    description:
      "Rider-only endpoint for rejecting an auto-assigned order with a mandatory reason. The rejected rider is excluded from immediate reassignment.",
  })
  rejectAssignedOrder(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: RejectAssignedOrderDto,
  ) {
    return this.orders.rejectAssignedOrder(request.user!, id, input);
  }
}
