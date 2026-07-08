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
import { CreateItemModifierDto, UpdateItemModifierDto } from "./dto/catalog.dto";

@ApiTags("Item Modifiers")
@Controller({ path: "item-modifiers", version: "1" })
export class ItemModifiersController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiMessage("Modifiers retrieved")
  @ApiOperation({
    summary: "List item modifiers",
    description: "Retrieves item modifiers, optionally filtered by outletId.",
  })
  list(@Query("outletId") outletId?: string) {
    return this.catalog.listPublicModifiers(outletId);
  }

  @Get(":id")
  @ApiMessage("Modifier retrieved")
  @ApiOperation({
    summary: "Get item modifier detail",
    description: "Retrieves the details of a specific item modifier by ID.",
  })
  get(@Param("id") id: string) {
    return this.catalog.getPublicModifier(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Modifier created successfully")
  @ApiOperation({
    summary: "Create item modifier",
    description: "Allows a super admin or outlet admin to create a new item modifier.",
  })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateItemModifierDto) {
    return this.catalog.createModifier(request.user!, input);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Modifier updated successfully")
  @ApiOperation({
    summary: "Update item modifier",
    description: "Allows a super admin or outlet admin to modify an existing item modifier.",
  })
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: UpdateItemModifierDto,
  ) {
    return this.catalog.updateModifier(request.user!, id, input);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Modifier deleted successfully")
  @ApiOperation({
    summary: "Delete item modifier",
    description: "Allows a super admin or outlet admin to delete an item modifier.",
  })
  delete(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.catalog.deleteModifier(request.user!, id);
  }
}
