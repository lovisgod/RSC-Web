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
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";

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
  ListMenuItemsQueryDto,
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
  @ApiOperation({
    summary: "List menu items",
    description: "Retrieves menu items, supporting pagination or simple lists.",
  })
  list(@Query() query: ListMenuItemsQueryDto) {
    return query.paginated
      ? this.catalog.listPublicItemsPage(query)
      : this.catalog.listPublicItems(query);
  }

  @Get(":id")
  @ApiMessage("Menu item retrieved")
  @ApiOperation({
    summary: "Get menu item detail",
    description: "Retrieves the details of a specific menu item by ID.",
  })
  get(@Param("id") id: string) {
    return this.catalog.getPublicItem(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Menu item created successfully")
  @ApiOperation({
    summary: "Create menu item",
    description: "Allows a super admin or outlet admin to create a new menu item.",
  })
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateMenuItemDto) {
    return this.catalog.createItem(request.user!, input);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiMessage("Menu item updated successfully")
  @ApiOperation({
    summary: "Update menu item",
    description: "Allows a super admin or outlet admin to modify menu item details.",
  })
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
  @ApiOperation({
    summary: "Update menu item availability",
    description: "Allows a super admin or outlet admin to toggle a menu item availability.",
  })
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
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiMessage("Menu item image uploaded successfully")
  @ApiOperation({
    summary: "Upload menu item image",
    description: "Allows a super admin or outlet admin to upload an image for a menu item.",
  })
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
  @ApiOperation({
    summary: "Rate menu item",
    description: "Allows a customer to rate a menu item.",
  })
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
  @ApiOperation({
    summary: "Delete menu item",
    description: "Allows a super admin or outlet admin to delete a menu item.",
  })
  delete(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.catalog.deleteItem(request.user!, id);
  }
}
