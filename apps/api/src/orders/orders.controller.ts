import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { from, interval, map, Observable, startWith, switchMap } from "rxjs";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import {
  CompleteDeliveryDto,
  ListAdminOrdersQueryDto,
  UpdateOrderStatusDto,
} from "./dto/orders.dto";
import { OrdersService } from "./orders.service";

@ApiTags("Orders")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: "orders", version: "1" })
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiMessage("Orders retrieved")
  @ApiOperation({
    summary: "List my orders",
    description:
      "Customer-facing endpoint that returns only the authenticated end user's orders, newest first.",
  })
  listMine(@Req() request: AuthenticatedRequest) {
    return this.orders.listMine(request.user!);
  }

  @Get("admin")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Admin orders retrieved")
  @ApiOperation({
    summary: "List orders for super admins and outlet admins",
    description:
      "Operational order list with optional filters. Super admins can see all orders and filter by outlet, status, sub-order status, delivery mode, customer, and date range. Outlet admins are automatically scoped to their own outlet; if outletId is supplied it must match their outlet.",
  })
  listAdmin(@Req() request: AuthenticatedRequest, @Query() query: ListAdminOrdersQueryDto) {
    return this.orders.listAdmin(request.user!, query);
  }

  @Get(":id")
  @ApiMessage("Order retrieved")
  @ApiOperation({
    summary: "Get my order",
    description:
      "Customer-facing endpoint that returns one order detail only when it belongs to the authenticated end user.",
  })
  getMine(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.orders.getMine(request.user!, id);
  }

  @Post(":id/reorder")
  @ApiMessage("Reorder initiated")
  @ApiOperation({
    summary: "Reorder my previous order",
    description:
      "Customer-facing endpoint that creates a new checkout/payment initiation from a previous order owned by the authenticated end user.",
  })
  reorder(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.orders.reorder(request.user!, id);
  }

  @Patch(":id/status")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RIDER)
  @ApiMessage("Order status updated")
  @ApiOperation({
    summary: "Update operational order status",
    description:
      "Operational endpoint for super admins, outlet admins, and riders to update an order status. Outlet admins can only update orders that include their outlet.",
  })
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: UpdateOrderStatusDto,
  ) {
    return this.orders.updateStatus(request.user!, id, input);
  }

  @Post(":id/complete-delivery")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @ApiMessage("Delivery completed")
  @ApiOperation({
    summary: "Complete delivery with customer code",
    description:
      "Rider-only endpoint that marks an assigned order delivered after validating the customer's six-digit delivery completion code.",
  })
  completeDelivery(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: CompleteDeliveryDto,
  ) {
    return this.orders.completeDelivery(request.user!, id, input);
  }

  @Get(":id/rider-location")
  @ApiMessage("Latest rider location retrieved")
  @ApiOperation({
    summary: "Get latest rider location for my order",
    description:
      "Customer-facing endpoint that returns the latest rider location only for an order owned by the authenticated end user.",
  })
  latestRiderLocation(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.orders.latestRiderLocation(request.user!, id);
  }

  @Sse(":id/rider-location/stream")
  @ApiOperation({
    summary: "Stream rider location for my order",
    description:
      "Customer-facing SSE endpoint that streams rider location updates for an order owned by the authenticated end user.",
  })
  riderLocationStream(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Observable<MessageEvent> {
    return interval(5_000).pipe(
      startWith(0),
      switchMap(() => from(this.orders.latestRiderLocation(request.user!, id))),
      map((location) => ({ data: location ?? {} })),
    );
  }
}
