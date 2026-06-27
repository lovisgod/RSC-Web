import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { CatalogService } from "./catalog.service";
import { CreateOutletDto, UpdateOutletDto, UpdateOutletOnlineStatusDto } from "./dto/catalog.dto";

@ApiTags("Outlets")
@Controller({ path: "outlets", version: "1" })
export class OutletsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiMessage("Outlets retrieved")
  list() {
    return this.catalog.listPublicOutlets();
  }

  @Get(":id")
  @ApiMessage("Outlet retrieved")
  get(@Param("id") id: string) {
    return this.catalog.getPublicOutlet(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Outlet created successfully")
  create(@Body() input: CreateOutletDto) {
    return this.catalog.createOutlet(input);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Outlet updated successfully")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: UpdateOutletDto,
  ) {
    return this.catalog.updateOutlet(request.user!, id, input);
  }

  @Patch(":id/online-status")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Outlet online status updated successfully")
  updateOnlineStatus(@Param("id") id: string, @Body() input: UpdateOutletOnlineStatusDto) {
    return this.catalog.updateOutletOnlineStatus(id, input);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Outlet deleted successfully")
  delete(@Param("id") id: string) {
    return this.catalog.deleteOutlet(id);
  }
}
