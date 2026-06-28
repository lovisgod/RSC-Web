import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Req,
  Sse,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { from, interval, map, Observable, startWith, switchMap } from "rxjs";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { CompleteDeliveryDto, UpdateOrderStatusDto } from "./dto/orders.dto";
import { OrdersService } from "./orders.service";

@ApiTags("Orders")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: "orders", version: "1" })
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiMessage("Orders retrieved")
  listMine(@Req() request: AuthenticatedRequest) {
    return this.orders.listMine(request.user!);
  }

  @Get(":id")
  @ApiMessage("Order retrieved")
  getMine(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.orders.getMine(request.user!, id);
  }

  @Post(":id/reorder")
  @ApiMessage("Reorder initiated")
  reorder(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.orders.reorder(request.user!, id);
  }

  @Patch(":id/status")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RIDER)
  @ApiMessage("Order status updated")
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
  completeDelivery(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: CompleteDeliveryDto,
  ) {
    return this.orders.completeDelivery(request.user!, id, input);
  }

  @Get(":id/rider-location")
  @ApiMessage("Latest rider location retrieved")
  latestRiderLocation(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.orders.latestRiderLocation(request.user!, id);
  }

  @Sse(":id/rider-location/stream")
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
