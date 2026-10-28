#!/usr/bin/env ts-node
/**
 * Removes the Taste of Naija menu records created by seed-taste-of-naija-menu.ts.
 *
 * This intentionally does not touch Cloudinary assets. Use --dry-run first,
 * then pass --confirm to perform the database deletion.
 */
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
import { tasteOfNaijaMenuData } from "./seeds/taste-of-naija-menu.data";

loadEnvironment();

const { values: args } = parseArgs({
  options: {
    confirm: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    outlet: { type: "string" },
  },
});

const DRY_RUN = Boolean(args["dry-run"]);
const CONFIRM = Boolean(args.confirm);
const OUTLET_ID = args.outlet ?? tasteOfNaijaMenuData.outletId;

function seededItemNames(): string[] {
  const names = new Set<string>();
  for (const category of tasteOfNaijaMenuData.categories) {
    for (const item of category.items) {
      names.add(item.name);
    }
  }
  return [...names];
}

async function collectTargets(manager: EntityManager) {
  const categoryRepo = manager.getRepository(MenuCategory);
  const itemRepo = manager.getRepository(MenuItem);
  const groupRepo = manager.getRepository(ItemModifierGroup);
  const modRepo = manager.getRepository(ItemModifier);
  const linkRepo = manager.getRepository(MenuItemModifierGroup);

  const categoryNames = tasteOfNaijaMenuData.categories.map(({ name }) => name);
  const groupNames = tasteOfNaijaMenuData.modifierGroups.map(({ name }) => name);

  const categories = await categoryRepo.find({
    where: { outletId: OUTLET_ID, name: In(categoryNames) },
  });
  const categoryIds = categories.map(({ id }) => id);

  const items = categoryIds.length
    ? await itemRepo.find({
        where: {
          outletId: OUTLET_ID,
          categoryId: In(categoryIds),
          name: In(seededItemNames()),
        },
      })
    : [];
  const itemIds = items.map(({ id }) => id);

  const groups = await groupRepo.find({
    where: { outletId: OUTLET_ID, name: In(groupNames) },
  });
  const groupIds = groups.map(({ id }) => id);

  const links =
    itemIds.length || groupIds.length
      ? await linkRepo.find({
          where: [
            ...(itemIds.length ? [{ menuItemId: In(itemIds) }] : []),
            ...(groupIds.length ? [{ groupId: In(groupIds) }] : []),
          ],
        })
      : [];
  const modifierIds = groupIds.length
    ? (await modRepo.find({ where: { outletId: OUTLET_ID, groupId: In(groupIds) } })).map(
        ({ id }) => id,
      )
    : [];

  return { categories, items, groups, modifiers: modifierIds, links };
}

async function main(): Promise<void> {
  if (!DRY_RUN && !CONFIRM) {
    throw new Error(
      "Refusing to delete Taste of Naija menu data without --confirm. Run with --dry-run first.",
    );
  }

  await dataSource.initialize();

  try {
    const targets = await collectTargets(dataSource.manager);
    console.log("\nTASTE OF NAIJA MENU UNDO");
    console.log("========================");
    console.log(`Outlet ID : ${OUTLET_ID}`);
    console.log(`Dry Run   : ${DRY_RUN}`);
    console.log(`Categories: ${targets.categories.length}`);
    console.log(`Items     : ${targets.items.length}`);
    console.log(`Links     : ${targets.links.length}`);
    console.log(`Modifiers : ${targets.modifiers.length}`);
    console.log(`Groups    : ${targets.groups.length}`);

    if (DRY_RUN) {
      console.log("\nNo changes written. Re-run with --confirm to delete these records.");
      return;
    }

    await dataSource.transaction(async (manager) => {
      const itemIds = targets.items.map(({ id }) => id);
      const groupIds = targets.groups.map(({ id }) => id);
      const modifierIds = targets.modifiers;
      const categoryIds = targets.categories.map(({ id }) => id);

      if (targets.links.length) {
        await manager.getRepository(MenuItemModifierGroup).delete({
          id: In(targets.links.map(({ id }) => id)),
        });
      }
      if (modifierIds.length) {
        await manager.getRepository(ItemModifier).delete({ id: In(modifierIds) });
      }
      if (itemIds.length) {
        await manager.getRepository(MenuItem).delete({ id: In(itemIds) });
      }
      if (groupIds.length) {
        await manager.getRepository(ItemModifierGroup).delete({ id: In(groupIds) });
      }
      if (categoryIds.length) {
        await manager.getRepository(MenuCategory).delete({ id: In(categoryIds) });
      }
    });

    console.log("\nTaste of Naija menu records deleted. Cloudinary assets were left untouched.");
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((err: unknown) => {
  console.error(
    "Taste of Naija menu undo failed:",
    err instanceof Error ? (err.stack ?? err.message) : err,
  );
  process.exitCode = 1;
});
