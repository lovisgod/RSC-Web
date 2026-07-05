import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import {
  CreateNotificationCampaignDto,
  CreateNotificationDto,
  CreatePromoNotificationDto,
  RegisterDeviceTokenDto,
  UpdateNotificationPreferencesDto,
} from "./dto/notification.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notifications")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: "notifications", version: "1" })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiMessage("Notifications retrieved")
  @ApiOperation({
    summary: "List the authenticated user's notifications",
    description:
      "Returns the current user's notification inbox. Admin-created promos only appear here when this request is made with a recipient user's token.",
  })
  listMine(@Req() request: AuthenticatedRequest) {
    return this.notifications.listMine(request.user!);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Notification created successfully")
  @ApiOperation({
    summary: "Create a direct notification for one recipient",
    description:
      "Creates one notification row for the specified recipientId and recipientRole, then attempts push delivery if the recipient has a registered device token. This is not a broadcast or scheduled campaign endpoint.",
  })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateNotificationDto) {
    return this.notifications.create(request.user!, input);
  }

  @Post("device-token")
  @ApiMessage("Device token registered")
  @ApiOperation({
    summary: "Register the authenticated user's push device token",
    description:
      "Stores the user's FCM device token so future direct, promo, order, or campaign notifications can be delivered as push notifications.",
  })
  registerDeviceToken(@Req() request: AuthenticatedRequest, @Body() input: RegisterDeviceTokenDto) {
    return this.notifications.registerDeviceToken(request.user!, input.token);
  }

  @Get("preferences")
  @ApiMessage("Notification preferences retrieved")
  @ApiOperation({
    summary: "Get notification preferences",
    description:
      "Returns the authenticated user's notification preferences. Order status notifications are always enabled for operations.",
  })
  preferences(@Req() request: AuthenticatedRequest) {
    return this.notifications.getPreferences(request.user!);
  }

  @Patch("preferences")
  @ApiMessage("Notification preferences updated")
  @ApiOperation({
    summary: "Update notification preferences",
    description:
      "Updates opt-in/out preferences for promotions, discounts, and seasonal offers. orderStatus is always returned as true.",
  })
  updatePreferences(
    @Req() request: AuthenticatedRequest,
    @Body() input: UpdateNotificationPreferencesDto,
  ) {
    return this.notifications.updatePreferences(request.user!, input);
  }

  @Post("promos")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Promo notifications queued")
  @ApiOperation({
    summary: "Broadcast an immediate promo notification by role",
    description:
      "Creates notification rows immediately for every user with the selected recipientRole and attempts push delivery for recipients with device tokens.",
  })
  broadcastPromo(@Req() request: AuthenticatedRequest, @Body() input: CreatePromoNotificationDto) {
    return this.notifications.broadcastPromo(request.user!, input);
  }

  @Post("campaigns")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Notification campaign scheduled")
  @ApiOperation({
    summary: "Schedule a central push notification campaign",
    description:
      "Creates a scheduled campaign for a customer segment. BullMQ dispatches it at scheduledAt; customer inbox notification rows are created when the campaign dispatches.",
  })
  scheduleCampaign(
    @Req() request: AuthenticatedRequest,
    @Body() input: CreateNotificationCampaignDto,
  ) {
    return this.notifications.scheduleCampaign(request.user!, input);
  }

  @Get("campaigns")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Notification campaigns retrieved")
  @ApiOperation({
    summary: "List scheduled notification campaigns and delivery reports",
    description:
      "Super-admin reporting endpoint for campaign status, schedule, dispatch time, total targeted, sent count, and failed count. This is not the customer notification inbox.",
  })
  listCampaigns() {
    return this.notifications.listCampaigns();
  }

  @Patch(":id/read")
  @ApiMessage("Notification marked as read")
  @ApiOperation({
    summary: "Mark a notification as read",
    description: "Marks one notification in the authenticated user's inbox as read.",
  })
  markRead(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.notifications.markRead(request.user!, id);
  }
}
