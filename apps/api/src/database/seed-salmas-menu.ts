#!/usr/bin/env ts-node
/**
 * Salmas Menu Seed Script
 *
 * Upserts the Salmas menu (categories, items, modifier groups, modifier links)
 * for the Salmas outlet. Re-running it is safe: menu items are matched within
 * their category using `outletId + categoryId + name`.
 *
 * Usage:
 *   # Locally via ts-node:
 *   pnpm --filter @rsc/api seed:menu:salmas [--dry-run] [--outlet=<id>]
 *
 *   # Inside API container (production build):
 *   node dist/src/database/seed-salmas-menu.js [--dry-run] [--outlet=<id>]
 */
import "reflect-metadata";
import { parseArgs } from "node:util";
import { config as loadEnvironment } from "dotenv";

import dataSource from "./data-source";
import { Outlet } from "../outlets/outlet.entity";
import { MenuCategory } from "../catalog/menu-category.entity";
import { MenuItem } from "../catalog/menu-item.entity";
import { ItemModifierGroup } from "../catalog/item-modifier-group.entity";
import { ItemModifier } from "../catalog/item-modifier.entity";
import { MenuItemModifierGroup } from "../catalog/menu-item-modifier-group.entity";
import { salmasMenuData } from "./seeds/salmas-menu.data";

loadEnvironment();

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    outlet: { type: "string" },
  },
});

const DRY_RUN = Boolean(args["dry-run"]);
const OUTLET_ID = args["outlet"] ?? salmasMenuData.outletId;

async function main(): Promise<void> {
  const startTime = Date.now();
  console.log(`\n🕌  SALMAS MENU MIGRATION / SEED`);
  console.log(`=================================================`);
  console.log(`   Outlet ID : ${OUTLET_ID}`);
  console.log(`   Dry Run   : ${DRY_RUN}`);
  console.log(`   Categories: ${salmasMenuData.categories.length}`);
  const totalItemCount = salmasMenuData.categories.reduce((acc, c) => acc + c.items.length, 0);
  console.log(`   Total Item: ${totalItemCount}`);
  console.log(`=================================================\n`);

  await dataSource.initialize();

  try {
    const outletRepo = dataSource.getRepository(Outlet);
    const categoryRepo = dataSource.getRepository(MenuCategory);
    const itemRepo = dataSource.getRepository(MenuItem);
    const groupRepo = dataSource.getRepository(ItemModifierGroup);
    const modRepo = dataSource.getRepository(ItemModifier);
    const linkRepo = dataSource.getRepository(MenuItemModifierGroup);

    // 1. Check outlet exists
    const outlet = await outletRepo.findOneBy({ id: OUTLET_ID });
    if (!outlet) {
      console.warn(`⚠️  WARNING: Outlet with ID "${OUTLET_ID}" not found in "outlets" table.`);
      console.warn(`   Proceeding anyway (or make sure you specify the right --outlet=<id>).`);
    } else {
      console.log(`✓ Outlet confirmed: ${outlet.name} (${outlet.id})`);
    }

    // 2. Upsert modifier groups and modifiers
    console.log(`\n📦 Upserting modifier groups...`);
    const modifierGroupMap = new Map<string, string>(); // groupName -> groupId

    for (const [groupOrder, groupSeed] of salmasMenuData.modifierGroups.entries()) {
      let group = await groupRepo.findOneBy({
        outletId: OUTLET_ID,
        name: groupSeed.name,
      });

      if (!group) {
        group = groupRepo.create({
          outletId: OUTLET_ID,
          name: groupSeed.name,
          minSelections: groupSeed.minSelections,
          maxSelections: groupSeed.maxSelections,
          isRequired: groupSeed.isRequired,
          sortOrder: groupOrder,
        });
      } else {
        group.minSelections = groupSeed.minSelections;
        group.maxSelections = groupSeed.maxSelections;
        group.isRequired = groupSeed.isRequired;
        group.sortOrder = groupOrder;
      }

      if (!DRY_RUN) {
        group = await groupRepo.save(group);
      } else {
        group.id = `dry-run-group-${groupOrder}`;
      }

      modifierGroupMap.set(groupSeed.name, group.id);

      // Upsert modifiers
      for (const [modOrder, modSeed] of groupSeed.modifiers.entries()) {
        if (!DRY_RUN) {
          let mod = await modRepo.findOneBy({
            outletId: OUTLET_ID,
            groupId: group.id,
            name: modSeed.name,
          });

          if (!mod) {
            mod = modRepo.create({
              outletId: OUTLET_ID,
              groupId: group.id,
              name: modSeed.name,
              priceDeltaMinor: modSeed.priceDeltaMinor,
              currency: "NGN",
              isAvailable: true,
              sortOrder: modOrder,
            });
          } else {
            mod.priceDeltaMinor = modSeed.priceDeltaMinor;
            mod.sortOrder = modOrder;
            mod.isAvailable = true;
          }
          await modRepo.save(mod);
        }
      }

      console.log(`  ✓ [Group] ${groupSeed.name} (${groupSeed.modifiers.length} modifiers)`);
    }

    // 3. Upsert categories and items
    console.log(`\n🗂️  Upserting categories and items...`);
    let categoriesUpserted = 0;
    let itemsUpserted = 0;
    let itemsWithImages = 0;
    let modifierLinksCreated = 0;

    for (const [catIndex, catSeed] of salmasMenuData.categories.entries()) {
      let category = await categoryRepo.findOneBy({
        outletId: OUTLET_ID,
        name: catSeed.name,
      });

      if (!category) {
        category = categoryRepo.create({
          outletId: OUTLET_ID,
          name: catSeed.name,
          sortOrder: catSeed.sortOrder ?? catIndex,
          isActive: catSeed.isActive ?? true,
        });
      } else {
        category.sortOrder = catSeed.sortOrder ?? catIndex;
        category.isActive = catSeed.isActive ?? true;
      }

      if (!DRY_RUN) {
        category = await categoryRepo.save(category);
      } else {
        category.id = `dry-run-cat-${catIndex}`;
      }
      categoriesUpserted++;

      let catImages = 0;

      for (const [itemIndex, itemSeed] of catSeed.items.entries()) {
        let item = DRY_RUN
          ? itemRepo.create({
              outletId: OUTLET_ID,
              categoryId: category.id,
              name: itemSeed.name,
              description: itemSeed.description,
              priceMinor: itemSeed.priceMinor,
              currency: "NGN",
              imageUrl: itemSeed.imageUrl,
              isAvailable: itemSeed.isAvailable ?? true,
              sortOrder: itemSeed.sortOrder ?? itemIndex,
            })
          : await itemRepo.findOneBy({
              outletId: OUTLET_ID,
              categoryId: category.id,
              name: itemSeed.name,
            });

        if (!item) {
          item = itemRepo.create({
            outletId: OUTLET_ID,
            categoryId: category.id,
            name: itemSeed.name,
            description: itemSeed.description,
            priceMinor: itemSeed.priceMinor,
            currency: "NGN",
            imageUrl: itemSeed.imageUrl,
            isAvailable: itemSeed.isAvailable ?? true,
            sortOrder: itemSeed.sortOrder ?? itemIndex,
          });
        } else {
          item.categoryId = category.id;
          item.description = itemSeed.description;
          item.priceMinor = itemSeed.priceMinor;
          if (itemSeed.imageUrl) {
            item.imageUrl = itemSeed.imageUrl;
          }
          item.isAvailable = itemSeed.isAvailable ?? true;
          item.sortOrder = itemSeed.sortOrder ?? itemIndex;
        }

        if (itemSeed.imageUrl) {
          itemsWithImages++;
          catImages++;
        }

        if (!DRY_RUN) {
          item = await itemRepo.save(item);

          // Link modifier groups
          for (const [order, groupName] of (itemSeed.modifierGroupRefs ?? []).entries()) {
            const groupId = modifierGroupMap.get(groupName);
            if (!groupId) continue;

            const existingLink = await linkRepo.findOneBy({
              menuItemId: item.id,
              groupId,
            });

            if (!existingLink) {
              await linkRepo.save(
                linkRepo.create({
                  menuItemId: item.id,
                  groupId,
                  sortOrder: order,
                }),
              );
              modifierLinksCreated++;
            }
          }
        }
        itemsUpserted++;
      }

      const imgTag = catImages > 0 ? ` (${catImages} with Cloudinary images)` : "";
      console.log(
        `  ✓ [${catIndex + 1}/${salmasMenuData.categories.length}] ${catSeed.name} (${catSeed.items.length} items${imgTag})`,
      );
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n=================================================`);
    console.log(`🎉  MIGRATION COMPLETED in ${elapsed}s`);
    console.log(`=================================================`);
    console.log(`   Categories upserted : ${categoriesUpserted}`);
    console.log(`   Items upserted      : ${itemsUpserted}`);
    console.log(`   Items with images   : ${itemsWithImages}`);
    console.log(`   Modifier groups     : ${salmasMenuData.modifierGroups.length}`);
    console.log(`   Modifier links      : ${modifierLinksCreated}`);
    if (DRY_RUN) {
      console.log(`\n⚠️   DRY-RUN completed. No changes written to database.`);
    }
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((err: unknown) => {
  console.error(
    "❌ Fatal error during seed:",
    err instanceof Error ? (err.stack ?? err.message) : err,
  );
  process.exitCode = 1;
});
