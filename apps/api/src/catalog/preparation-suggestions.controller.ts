import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { CatalogService } from "./catalog.service";
import {
  CreatePreparationSuggestionDto,
  QueryPreparationSuggestionsDto,
  UpdatePreparationSuggestionDto,
} from "./dto/catalog.dto";

@ApiTags("Preparation Suggestions")
@Controller({ path: "preparation-suggestions", version: "1" })
export class PreparationSuggestionsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  @ApiMessage("Preparation suggestions retrieved successfully")
  @ApiOperation({
    summary: "List active preparation suggestions for client autocomplete",
    description: "Filters suggestions based on outletId, menuItemId, and query text q.",
  })
  list(@Query() query: QueryPreparationSuggestionsDto) {
    return this.catalog.listPreparationSuggestions(query);
  }

  @Get("admin")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Admin preparation suggestions retrieved successfully")
  @ApiOperation({ summary: "List suggestions for super admin management" })
  listAdmin(@Query() query: QueryPreparationSuggestionsDto) {
    return this.catalog.listPreparationSuggestionsAdmin(query);
  }

  @Post("admin")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Preparation suggestion created successfully")
  @ApiOperation({ summary: "Create a new preparation suggestion" })
  create(@Body() input: CreatePreparationSuggestionDto) {
    return this.catalog.createPreparationSuggestion(input);
  }

  @Patch("admin/:id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Preparation suggestion updated successfully")
  @ApiOperation({ summary: "Update a preparation suggestion" })
  update(@Param("id") id: string, @Body() input: UpdatePreparationSuggestionDto) {
    return this.catalog.updatePreparationSuggestion(id, input);
  }

  @Delete("admin/:id")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiMessage("Preparation suggestion deleted successfully")
  @ApiOperation({ summary: "Delete a preparation suggestion" })
  delete(@Param("id") id: string) {
    return this.catalog.deletePreparationSuggestion(id);
  }
}
