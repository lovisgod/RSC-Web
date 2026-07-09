import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { Customer } from "../auth/customer.entity";
import { MediaModule } from "../media/media.module";
import { Outlet } from "../outlets/outlet.entity";
import { RealtimeModule } from "../realtime/realtime.module";
import { CatalogService } from "./catalog.service";
import { ItemModifierGroupsController } from "./item-modifier-groups.controller";
import { ItemModifierGroup } from "./item-modifier-group.entity";
import { ItemModifiersController } from "./item-modifiers.controller";
import { ItemModifier } from "./item-modifier.entity";
import { MenuCategoriesController } from "./menu-categories.controller";
import { MenuCategory } from "./menu-category.entity";
import { MenuItemModifierGroup } from "./menu-item-modifier-group.entity";
import { MenuItemRating } from "./menu-item-rating.entity";
import { OutletRating } from "./outlet-rating.entity";
import { MenuItemsController } from "./menu-items.controller";
import { MenuItem } from "./menu-item.entity";
import { OutletsController } from "./outlets.controller";
import { PreparationSuggestion } from "./preparation-suggestion.entity";
import { PreparationSuggestionsController } from "./preparation-suggestions.controller";

@Module({
  imports: [
    AuthModule,
    MediaModule,
    RealtimeModule,
    TypeOrmModule.forFeature([
      Outlet,
      Customer,
      MenuCategory,
      MenuItem,
      MenuItemRating,
      OutletRating,
      ItemModifierGroup,
      ItemModifier,
      MenuItemModifierGroup,
      PreparationSuggestion,
    ]),
  ],
  controllers: [
    OutletsController,
    MenuCategoriesController,
    MenuItemsController,
    ItemModifierGroupsController,
    ItemModifiersController,
    PreparationSuggestionsController,
  ],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
