import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { CatalogService } from "./catalog.service";
import { CreateOutletDto, UpdateOutletDto } from "./dto/catalog.dto";

@ApiTags("Outlets")
@ApiBearerAuth()
@Controller({ path: "outlets", version: "1" })
@UseGuards(AuthGuard, RolesGuard)
export class OutletsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Outlets retrieved")
  list(@Req() request: AuthenticatedRequest) {
    return this.catalog.listOutlets(request.user!);
  }

  @Get(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Outlet retrieved")
  get(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.catalog.getOutlet(request.user!, id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Outlet created successfully")
  create(@Body() input: CreateOutletDto) {
    return this.catalog.createOutlet(input);
  }

  @Patch(":id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Outlet updated successfully")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: UpdateOutletDto,
  ) {
    return this.catalog.updateOutlet(request.user!, id, input);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Outlet deleted successfully")
  delete(@Param("id") id: string) {
    return this.catalog.deleteOutlet(id);
  }
}
