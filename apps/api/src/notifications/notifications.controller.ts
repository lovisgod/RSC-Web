import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { CreateNotificationDto } from "./dto/notification.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notifications")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: "notifications", version: "1" })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiMessage("Notifications retrieved")
  listMine(@Req() request: AuthenticatedRequest) {
    return this.notifications.listMine(request.user!);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Notification created successfully")
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateNotificationDto) {
    return this.notifications.create(request.user!, input);
  }

  @Patch(":id/read")
  @ApiMessage("Notification marked as read")
  markRead(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.notifications.markRead(request.user!, id);
  }
}
