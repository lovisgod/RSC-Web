#!/usr/bin/env ts-node
/** Reversibly removes records belonging to one generated outlet seed. */
import "reflect-metadata";
import { parseArgs } from "node:util";
import { config as loadEnvironment } from "dotenv";
import { In, type EntityManager } from "typeorm";
import dataSource from "./data-source";
import { MenuCategory } from "../catalog/menu-category.entity";
import { MenuItem } from "../catalog/menu-item.entity";
import { ItemModifierGroup } from "../catalog/item-modifier-group.entity";
import { ItemModifier } from "../catalog/item-modifier.entity";
import { MenuItemModifierGroup } from "../catalog/menu-item-modifier-group.entity";
import { cactusMenuData } from "./seeds/cactus-menu.data";
import { farfallinoMenuData } from "./seeds/farfallino-menu.data";

loadEnvironment();
const { values: args } = parseArgs({
  options: {
    confirm: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    outlet: { type: "string" },
    menu: { type: "string" },
  },
});
const menu = args.menu === "farfallino" ? farfallinoMenuData : cactusMenuData;
const outletId = args.outlet ?? menu.outletId;
const dryRun = Boolean(args["dry-run"]);

async function collect(manager: EntityManager) {
  const categories = await manager
    .getRepository(MenuCategory)
    .find({ where: { outletId, name: In(menu.categories.map((category) => category.name)) } });
  const categoryIds = categories.map((category) => category.id);
  const items = categoryIds.length
    ? await manager
        .getRepository(MenuItem)
        .find({ where: { outletId, categoryId: In(categoryIds) } })
    : [];
  const groups = await manager
    .getRepository(ItemModifierGroup)
    .find({ where: { outletId, name: In(menu.modifierGroups.map((group) => group.name)) } });
  const itemIds = items.map((item) => item.id);
  const groupIds = groups.map((group) => group.id);
  const links =
    itemIds.length || groupIds.length
      ? await manager.getRepository(MenuItemModifierGroup).find({
          where: [
            ...(itemIds.length ? [{ menuItemId: In(itemIds) }] : []),
            ...(groupIds.length ? [{ groupId: In(groupIds) }] : []),
          ],
        })
      : [];
  const modifiers = groupIds.length
    ? await manager.getRepository(ItemModifier).find({ where: { outletId, groupId: In(groupIds) } })
    : [];
  return { categories, items, groups, links, modifiers };
}

async function main() {
  if (!dryRun && !args.confirm)
    throw new Error("Refusing to delete menu data without --confirm. Run with --dry-run first.");
  await dataSource.initialize();
  try {
    const targets = await collect(dataSource.manager);
    console.log(`${menu === farfallinoMenuData ? "FARFALLINO" : "CACTUS"} MENU UNDO`, {
      outletId,
      dryRun,
      categories: targets.categories.length,
      items: targets.items.length,
      links: targets.links.length,
      modifiers: targets.modifiers.length,
      groups: targets.groups.length,
    });
    if (dryRun) return;
    await dataSource.transaction(async (manager) => {
      if (targets.links.length)
        await manager
          .getRepository(MenuItemModifierGroup)
          .delete({ id: In(targets.links.map((row) => row.id)) });
      if (targets.modifiers.length)
        await manager
          .getRepository(ItemModifier)
          .delete({ id: In(targets.modifiers.map((row) => row.id)) });
      if (targets.items.length)
        await manager
          .getRepository(MenuItem)
          .delete({ id: In(targets.items.map((row) => row.id)) });
      if (targets.groups.length)
        await manager
          .getRepository(ItemModifierGroup)
          .delete({ id: In(targets.groups.map((row) => row.id)) });
      if (targets.categories.length)
        await manager
          .getRepository(MenuCategory)
          .delete({ id: In(targets.categories.map((row) => row.id)) });
    });
  } finally {
    await dataSource.destroy();
  }
}
void main().catch((error: unknown) => {
  console.error("Menu undo failed:", error);
  process.exitCode = 1;
});
