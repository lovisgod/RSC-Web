import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { CatalogService } from "./catalog.service";
import { CreateItemModifierGroupDto, UpdateItemModifierGroupDto } from "./dto/catalog.dto";

@ApiTags("Item Modifier Groups")
@ApiBearerAuth()
@Controller({ path: "item-modifier-groups", version: "1" })
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class ItemModifierGroupsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiMessage("Modifier groups retrieved")
  list(@Req() request: AuthenticatedRequest, @Query("outletId") outletId?: string) {
    return this.catalog.listGroups(request.user!, outletId);
  }

  @Get(":id")
  @ApiMessage("Modifier group retrieved")
  get(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.catalog.getGroup(request.user!, id);
  }

  @Post()
  @ApiMessage("Modifier group created successfully")
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateItemModifierGroupDto) {
    return this.catalog.createGroup(request.user!, input);
  }

  @Patch(":id")
  @ApiMessage("Modifier group updated successfully")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: UpdateItemModifierGroupDto,
  ) {
    return this.catalog.updateGroup(request.user!, id, input);
  }

  @Delete(":id")
  @ApiMessage("Modifier group deleted successfully")
  delete(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.catalog.deleteGroup(request.user!, id);
  }
}
