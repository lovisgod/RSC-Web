#!/usr/bin/env ts-node
/**
 * Ensures the four real development outlets exist before their menu seeds run.
 * Existing outlet rows are left unchanged.
 */
import "reflect-metadata";
import { config as loadEnvironment } from "dotenv";

import dataSource from "./data-source";
import { cactusMenuData } from "./seeds/cactus-menu.data";
import { farfallinoMenuData } from "./seeds/farfallino-menu.data";
import { salmasMenuData } from "./seeds/salmas-menu.data";
import { tasteOfNaijaMenuData } from "./seeds/taste-of-naija-menu.data";
import { Outlet } from "../outlets/outlet.entity";

loadEnvironment();

const outletSeeds = [
  {
    id: cactusMenuData.outletId,
    name: cactusMenuData.outletName,
    cuisineType: "Nigerian",
  },
  {
    id: farfallinoMenuData.outletId,
    name: farfallinoMenuData.outletName,
    cuisineType: "Italian",
  },
  {
    id: salmasMenuData.outletId,
    name: salmasMenuData.outletName,
    cuisineType: "Lebanese",
  },
  {
    id: tasteOfNaijaMenuData.outletId,
    name: tasteOfNaijaMenuData.outletName,
    cuisineType: "Nigerian",
  },
] as const;

async function main(): Promise<void> {
  await dataSource.initialize();

  try {
    const outlets = dataSource.getRepository(Outlet);

    for (const seed of outletSeeds) {
      const existing = await outlets.findOneBy({ id: seed.id });
      if (existing) {
        console.log(`✓ existing outlet: ${existing.name} (${existing.id})`);
        continue;
      }

      const outlet = outlets.create({
        id: seed.id,
        name: seed.name,
        description: `${seed.name} menu on DineOut.`,
        cuisineType: seed.cuisineType,
        imageUrl: null,
        logoUrl: null,
        bannerUrl: null,
        isOnline: true,
        settlementSubaccountCode: null,
        latitude: null,
        longitude: null,
        deliveryRadiusKm: 15,
        deliveryFeeMinor: 150000,
      });

      await outlets.save(outlet);
      console.log(`✓ created outlet: ${outlet.name} (${outlet.id})`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error("❌ Development outlet seed failed:", error);
  process.exitCode = 1;
});
