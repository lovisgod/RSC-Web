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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { CatalogService } from "./catalog.service";
import { CreateItemModifierGroupDto, UpdateItemModifierGroupDto } from "./dto/catalog.dto";

@ApiTags("Item Modifier Groups")
@Controller({ path: "item-modifier-groups", version: "1" })
export class ItemModifierGroupsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiMessage("Modifier groups retrieved")
  @ApiOperation({
    summary: "List item modifier groups",
    description: "Retrieves item modifier groups, optionally filtered by outletId.",
  })
  list(@Query("outletId") outletId?: string) {
    return this.catalog.listPublicGroups(outletId);
  }

  @Get(":id")
  @ApiMessage("Modifier group retrieved")
  @ApiOperation({
    summary: "Get item modifier group detail",
    description: "Retrieves the details of a specific item modifier group by ID.",
  })
  get(@Param("id") id: string) {
    return this.catalog.getPublicGroup(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Modifier group created successfully")
  @ApiOperation({
    summary: "Create item modifier group",
    description: "Allows a super admin or outlet admin to create a new item modifier group.",
  })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateItemModifierGroupDto) {
    return this.catalog.createGroup(request.user!, input);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Modifier group updated successfully")
  @ApiOperation({
    summary: "Update item modifier group",
    description: "Allows a super admin or outlet admin to modify an existing item modifier group.",
  })
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: UpdateItemModifierGroupDto,
  ) {
    return this.catalog.updateGroup(request.user!, id, input);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Modifier group deleted successfully")
  @ApiOperation({
    summary: "Delete item modifier group",
    description: "Allows a super admin or outlet admin to delete an item modifier group.",
  })
  delete(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.catalog.deleteGroup(request.user!, id);
  }
}
