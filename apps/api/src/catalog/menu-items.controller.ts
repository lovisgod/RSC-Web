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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import type { UploadedImageFile } from "../media/media.service";
import { CatalogService } from "./catalog.service";
import {
  CreateMenuItemDto,
  RateMenuItemDto,
  UpdateMenuItemAvailabilityDto,
  UpdateMenuItemDto,
} from "./dto/catalog.dto";

@ApiTags("Menu Items")
@Controller({ path: "menu-items", version: "1" })
export class MenuItemsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiMessage("Menu items retrieved")
  list(@Query("outletId") outletId?: string) {
    return this.catalog.listPublicItems(outletId);
  }

  @Get(":id")
  @ApiMessage("Menu item retrieved")
  get(@Param("id") id: string) {
    return this.catalog.getPublicItem(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Menu item created successfully")
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateMenuItemDto) {
    return this.catalog.createItem(request.user!, input);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Menu item updated successfully")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: UpdateMenuItemDto,
  ) {
    return this.catalog.updateItem(request.user!, id, input);
  }

  @Patch(":id/availability")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Menu item availability updated successfully")
  updateAvailability(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: UpdateMenuItemAvailabilityDto,
  ) {
    return this.catalog.updateItemAvailability(request.user!, id, input);
  }

  @Post(":id/image")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor("file"))
  @ApiMessage("Menu item image uploaded successfully")
  uploadImage(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @UploadedFile() file: UploadedImageFile,
  ) {
    return this.catalog.uploadItemImage(request.user!, id, file);
  }

  @Post(":id/rating")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiMessage("Menu item rated successfully")
  rate(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() input: RateMenuItemDto,
  ) {
    return this.catalog.rateItem(request.user!, id, input);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Menu item deleted successfully")
  delete(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.catalog.deleteItem(request.user!, id);
  }
}
