import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { CatalogService } from "./catalog.service";
import {
  CreateMenuItemDto,
  UpdateMenuItemAvailabilityDto,
  UpdateMenuItemDto,
} from "./dto/catalog.dto";

@ApiTags("Menu Items")
@ApiBearerAuth()
@Controller({ path: "menu-items", version: "1" })
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class MenuItemsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiMessage("Menu items retrieved")
  list(@Req() request: AuthenticatedRequest, @Query("outletId") outletId?: string) {
    return this.catalog.listItems(request.user!, outletId);
  }

  @Get(":id")
  @ApiMessage("Menu item retrieved")
  get(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.catalog.getItem(request.user!, id);
  }

  @Post()
  @ApiMessage("Menu item created successfully")
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateMenuItemDto) {
    return this.catalog.createItem(request.user!, input);
  }

  @Patch(":id")
  @ApiMessage("Menu item updated successfully")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: UpdateMenuItemDto,
  ) {
    return this.catalog.updateItem(request.user!, id, input);
  }

  @Patch(":id/availability")
  @ApiMessage("Menu item availability updated successfully")
  updateAvailability(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: UpdateMenuItemAvailabilityDto,
  ) {
    return this.catalog.updateItemAvailability(request.user!, id, input);
  }

  @Delete(":id")
  @ApiMessage("Menu item deleted successfully")
  delete(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.catalog.deleteItem(request.user!, id);
  }
}
