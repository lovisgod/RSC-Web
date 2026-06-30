import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { Customer } from "../auth/customer.entity";
import { Outlet } from "../outlets/outlet.entity";
import { CatalogService } from "./catalog.service";
import { ItemModifierGroupsController } from "./item-modifier-groups.controller";
import { ItemModifierGroup } from "./item-modifier-group.entity";
import { ItemModifiersController } from "./item-modifiers.controller";
import { ItemModifier } from "./item-modifier.entity";
import { MenuCategoriesController } from "./menu-categories.controller";
import { MenuCategory } from "./menu-category.entity";
import { MenuItemModifierGroup } from "./menu-item-modifier-group.entity";
import { MenuItemsController } from "./menu-items.controller";
import { MenuItem } from "./menu-item.entity";
import { OutletsController } from "./outlets.controller";

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Outlet,
      Customer,
      MenuCategory,
      MenuItem,
      ItemModifierGroup,
      ItemModifier,
      MenuItemModifierGroup,
    ]),
  ],
  controllers: [
    OutletsController,
    MenuCategoriesController,
    MenuItemsController,
    ItemModifierGroupsController,
    ItemModifiersController,
  ],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
