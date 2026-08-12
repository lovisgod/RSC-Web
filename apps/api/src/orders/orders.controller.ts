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
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";
import {
  AssignOrderRiderDto,
  CompleteDeliveryDto,
  ListAdminOrdersQueryDto,
  ListCustomerOrdersQueryDto,
  PickupSubOrderDto,
  RiderCollectSubOrderDto,
  UpdateOrderStatusDto,
  VerifyPickupCodeDto,
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
  listMine(@Req() request: AuthenticatedRequest, @Query() query: ListCustomerOrdersQueryDto) {
    return this.orders.listMine(request.user!, query);
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

  // ─── Outlet-admin handoff verification ─────────────────────────────────────
  // NOTE: These routes must be declared BEFORE GET /:id to avoid NestJS
  // treating "outlet" as a literal order-id path parameter.

  @Post("outlet/verify-handoff")
  @RateLimit({ limit: 20, windowSeconds: 60 })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiMessage("Customer pickup verified")
  @ApiOperation({
    summary: "Verify customer walk-in pickup code",
    description:
      "Outlet-admin endpoint. Customer presents their sub-order pickup code; the matching READY sub-order is marked COLLECTED and the master order status is re-derived.",
  })
  verifyOutletHandoff(@Req() request: AuthenticatedRequest, @Body() input: VerifyPickupCodeDto) {
    return this.orders.verifyOutletHandoff(request.user!, input);
  }

  @Post("outlet/rider-collect")
  @RateLimit({ limit: 20, windowSeconds: 60 })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiMessage("Rider collection confirmed")
  @ApiOperation({
    summary: "Verify rider collection pickup code",
    description:
      "Outlet-admin endpoint. Rider presents the sub-order pickup code at the counter; the matching READY sub-order is marked DISPATCHED and the master order status is re-derived. Master order becomes OUT_FOR_DELIVERY when all non-rejected sub-orders are dispatched or collected.",
  })
  riderCollectSubOrder(
    @Req() request: AuthenticatedRequest,
    @Body() input: RiderCollectSubOrderDto,
  ) {
    return this.orders.riderCollectSubOrderByCode(request.user!, input);
  }

  // ─── Order detail / customer routes ─────────────────────────────────────────

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

  @Get(":id/dispatch")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RIDER)
  @ApiMessage("Rider dispatch retrieved")
  @ApiOperation({
    summary: "Get rider dispatch detail",
    description:
      "Returns pickup outlets, pickup codes, items, drop-off details, and order identifiers for a rider dispatch screen. Riders can only view dispatches assigned to them.",
  })
  getDispatch(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.orders.getDispatch(request.user!, id);
  }

  @Get(":id/reorder")
  @ApiMessage("Reorder details retrieved")
  @ApiOperation({
    summary: "Get previous order details for reorder",
    description:
      "Customer-facing endpoint that returns the items and configuration of a past order to allow the client to populate their cart/checkout flow.",
  })
  reorder(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.orders.reorder(request.user!, id);
  }

  @Patch(":id/status")
  @RateLimit({ limit: 30, windowSeconds: 60 })
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

  @Patch(":id/rider")
  @RateLimit({ limit: 10, windowSeconds: 60 })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Order rider assigned")
  @ApiOperation({
    summary: "Automatically assign an available rider to an order",
    description:
      "Operational endpoint for linking a master order to an available rider using fair distribution. The backend chooses a free rider with the fewest recent assignments. Super admins search all available riders. Outlet admins search available riders linked to their outlet, and only for orders that include their outlet.",
  })
  assignRider(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: AssignOrderRiderDto,
  ) {
    return this.orders.assignRider(request.user!, id, input);
  }

  @Patch(":id/sub-orders/:subOrderId/pickup")
  @RateLimit({ limit: 20, windowSeconds: 60 })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @ApiMessage("Sub-order pickup confirmed")
  @ApiOperation({
    summary: "Confirm pickup for one outlet sub-order",
    description:
      "Rider-only endpoint for marking one outlet pickup as collected while other outlet pickups on the same master order may still be pending.",
  })
  pickupSubOrder(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Param("subOrderId") subOrderId: string,
    @Body() input: PickupSubOrderDto,
  ) {
    return this.orders.pickupSubOrder(request.user!, id, subOrderId, input);
  }

  @Post(":id/complete-delivery")
  @RateLimit({ limit: 10, windowSeconds: 60 })
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
  @RateLimit({ limit: 60, windowSeconds: 60 })
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
