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
import { CreateMenuCategoryDto, UpdateMenuCategoryDto } from "./dto/catalog.dto";

@ApiTags("Menu Categories")
@Controller({ path: "menu-categories", version: "1" })
export class MenuCategoriesController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiMessage("Menu categories retrieved")
  list(@Query("outletId") outletId?: string) {
    return this.catalog.listPublicCategories(outletId);
  }

  @Get(":id")
  @ApiMessage("Menu category retrieved")
  get(@Param("id") id: string) {
    return this.catalog.getPublicCategory(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Menu category created successfully")
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateMenuCategoryDto) {
    return this.catalog.createCategory(request.user!, input);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Menu category updated successfully")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: UpdateMenuCategoryDto,
  ) {
    return this.catalog.updateCategory(request.user!, id, input);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Menu category deleted successfully")
  delete(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.catalog.deleteCategory(request.user!, id);
  }
}
