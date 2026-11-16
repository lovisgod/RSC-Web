#!/usr/bin/env ts-node
/**
 * Restores menu categories that were soft-deleted or lost from an outlet.
 *
 * Existing category rows are restored in place so existing menu items keep
 * their category IDs. If a category row no longer exists, a new row is
 * created and matching existing items are reattached by name.
 *
 * Usage:
 *   node dist/src/database/restore-outlet-categories.js --dry-run
 *   node dist/src/database/restore-outlet-categories.js --outlet=salmas --confirm
 */
import "reflect-metadata";
import { parseArgs } from "node:util";
import { config as loadEnvironment } from "dotenv";
import dataSource from "./data-source";
import { MenuCategory } from "../catalog/menu-category.entity";
import { MenuItem } from "../catalog/menu-item.entity";
import { salmasMenuData } from "./seeds/salmas-menu.data";
import { tasteOfNaijaMenuData } from "./seeds/taste-of-naija-menu.data";

loadEnvironment();

const { values: args } = parseArgs({
  options: {
    confirm: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    outlet: { type: "string", default: "all" },
  },
});

type MenuData = typeof salmasMenuData | typeof tasteOfNaijaMenuData;

const menus: Record<string, MenuData> = {
  salmas: salmasMenuData,
  "taste-of-naija": tasteOfNaijaMenuData,
};

const selectedMenus = args.outlet === "all" ? Object.values(menus) : [menus[args.outlet ?? ""]];

if (selectedMenus.some((menu) => !menu)) {
  throw new Error('Unknown outlet. Use "salmas", "taste-of-naija", or "all".');
}

const restoredMenus = selectedMenus as MenuData[];

const dryRun = Boolean(args["dry-run"]);
const confirm = Boolean(args.confirm);

async function main(): Promise<void> {
  if (!dryRun && !confirm) {
    throw new Error(
      "Refusing to restore production categories without --confirm. Run with --dry-run first.",
    );
  }

  await dataSource.initialize();

  try {
    const categoryRepo = dataSource.getRepository(MenuCategory);
    const itemRepo = dataSource.getRepository(MenuItem);

    for (const menu of restoredMenus) {
      const categoryResults: string[] = [];
      let reattachedItems = 0;

      for (const [index, categorySeed] of menu.categories.entries()) {
        let category = await categoryRepo.findOne({
          where: { outletId: menu.outletId, name: categorySeed.name },
          withDeleted: true,
        });

        const wasMissing = !category;
        if (!category) {
          category = categoryRepo.create({
            outletId: menu.outletId,
            name: categorySeed.name,
            sortOrder: categorySeed.sortOrder ?? index,
            isActive: categorySeed.isActive ?? true,
            availableFrom: menu === salmasMenuData ? "10:00" : "11:00",
            availableUntil: "22:00",
          });
        } else {
          category.sortOrder = categorySeed.sortOrder ?? index;
          category.isActive = categorySeed.isActive ?? true;
          category.availableFrom = menu === salmasMenuData ? "10:00" : "11:00";
          category.availableUntil = "22:00";
          category.deletedAt = null;
        }

        if (!dryRun) {
          category = await categoryRepo.save(category);
        } else if (!category.id) {
          category.id = `dry-run-category-${index}`;
        }

        for (const itemSeed of categorySeed.items) {
          const existingItem = await itemRepo.findOne({
            where: { outletId: menu.outletId, name: itemSeed.name },
            withDeleted: true,
          });

          if (!existingItem) continue;
          if (existingItem.categoryId !== category.id || existingItem.deletedAt) {
            reattachedItems++;
            if (!dryRun) {
              existingItem.categoryId = category.id;
              existingItem.deletedAt = null;
              await itemRepo.save(existingItem);
            }
          }
        }

        categoryResults.push(`${wasMissing ? "created" : "restored"}: ${category.name}`);
      }

      console.log(`\n${menu.outletName}`);
      console.log(`Categories ${dryRun ? "to restore" : "restored"}: ${categoryResults.length}`);
      console.log(`Items ${dryRun ? "to reattach" : "reattached"}: ${reattachedItems}`);
      for (const result of categoryResults) console.log(`  ✓ ${result}`);
    }

    if (dryRun) console.log("\nDry run complete. No changes were written.");
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error("Category restore failed:", error);
  process.exitCode = 1;
});
