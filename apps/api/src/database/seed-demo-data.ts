import "reflect-metadata";

import dataSource from "./data-source";
import { PiiCryptoService } from "../common/security/pii-crypto.service";
import { Customer } from "../auth/customer.entity";
import { CustomerStatus } from "../auth/customer-status.enum";
import { hashPassword } from "../auth/password";
import { normalizeNigerianPhoneNumber } from "../auth/phone-number";
import { UserRole } from "../auth/user-role.enum";
import { ItemModifierGroup } from "../catalog/item-modifier-group.entity";
import { ItemModifier } from "../catalog/item-modifier.entity";
import { MenuCategory } from "../catalog/menu-category.entity";
import { MenuItemModifierGroup } from "../catalog/menu-item-modifier-group.entity";
import { MenuItem } from "../catalog/menu-item.entity";
import { Outlet } from "../outlets/outlet.entity";

const defaultPassword = "password";

interface SeededUserSummary {
  role: UserRole.ADMIN | UserRole.CUSTOMER;
  name: string;
  email: string;
  phone: string;
  password: string;
  outlet: string;
}

interface SeededOutletSummary {
  outlet: string;
  outletId: string;
  cuisineType: string;
  admins: string[];
  users: string[];
  categories: string[];
  menuItems: string[];
  modifierGroups: string[];
  modifiers: string[];
}

const outlets = [
  {
    name: "Farfallino Kitchen",
    description: "Italian comfort food, fresh pasta, and family-style plates.",
    cuisineType: "Italian",
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
    momentSubaccountCode: "MOMENT_FARFALLINO",
    phoneSeed: 31000,
    emailPrefix: "farfallino",
    categories: [
      {
        name: "Pasta",
        items: [
          {
            name: "Creamy Chicken Alfredo",
            description: "Fettuccine, grilled chicken, parmesan, and cream sauce.",
            priceMinor: 680000,
          },
          {
            name: "Spicy Arrabbiata",
            description: "Penne tossed in chilli tomato sauce with basil.",
            priceMinor: 520000,
          },
        ],
      },
      {
        name: "Sides",
        items: [
          {
            name: "Garlic Bread",
            description: "Toasted baguette with garlic butter.",
            priceMinor: 180000,
          },
          {
            name: "Caprese Salad",
            description: "Tomato, mozzarella, basil, and balsamic glaze.",
            priceMinor: 350000,
          },
        ],
      },
    ],
    modifierGroups: [
      {
        name: "Protein",
        minSelections: 0,
        maxSelections: 1,
        modifiers: [
          { name: "Extra Chicken", priceDeltaMinor: 180000 },
          { name: "Prawns", priceDeltaMinor: 250000 },
        ],
      },
      {
        name: "Add-ons",
        minSelections: 0,
        maxSelections: 3,
        modifiers: [
          { name: "Parmesan", priceDeltaMinor: 80000 },
          { name: "Mushrooms", priceDeltaMinor: 90000 },
        ],
      },
    ],
  },
  {
    name: "Salma's Grill",
    description: "Charcoal-grilled Nigerian classics and quick lunch bowls.",
    cuisineType: "Nigerian Grill",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947",
    momentSubaccountCode: "MOMENT_SALMAS",
    phoneSeed: 32000,
    emailPrefix: "salmas",
    categories: [
      {
        name: "Grill",
        items: [
          {
            name: "Chicken Suya Plate",
            description: "Spiced chicken skewers with onions, yaji, and chips.",
            priceMinor: 540000,
          },
          {
            name: "Beef Suya Bowl",
            description: "Suya beef, jollof rice, slaw, and pepper sauce.",
            priceMinor: 620000,
          },
        ],
      },
      {
        name: "Rice",
        items: [
          {
            name: "Smoky Party Jollof",
            description: "Long grain rice, tomato stew, and firewood aroma.",
            priceMinor: 420000,
          },
          {
            name: "Fried Rice Combo",
            description: "Vegetable fried rice with grilled chicken.",
            priceMinor: 580000,
          },
        ],
      },
    ],
    modifierGroups: [
      {
        name: "Heat Level",
        minSelections: 1,
        maxSelections: 1,
        modifiers: [
          { name: "Mild", priceDeltaMinor: 0 },
          { name: "Extra Pepper", priceDeltaMinor: 50000 },
        ],
      },
      {
        name: "Extras",
        minSelections: 0,
        maxSelections: 3,
        modifiers: [
          { name: "Plantain", priceDeltaMinor: 120000 },
          { name: "Coleslaw", priceDeltaMinor: 80000 },
        ],
      },
    ],
  },
] as const;

async function main(): Promise<void> {
  await dataSource.initialize();

  try {
    const piiCrypto = new PiiCryptoService({
      get: () => ({
        piiEncryptionKey: process.env.PII_ENCRYPTION_KEY ?? "",
        piiHashPepper: process.env.PII_HASH_PEPPER ?? "",
        otpPepper: process.env.OTP_PEPPER ?? "",
        jwtSecret: process.env.JWT_SECRET ?? "",
        accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
        refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 604_800),
        adminInactivityTimeoutSeconds: Number(
          process.env.ADMIN_INACTIVITY_TIMEOUT_SECONDS ?? 1_800,
        ),
      }),
    } as never);
    const outletSummaries: SeededOutletSummary[] = [];
    const userSummaries: SeededUserSummary[] = [];

    for (const [outletIndex, outletSeed] of outlets.entries()) {
      const outlet = await upsertOutlet(outletSeed);
      const groups = await seedModifierGroups(outlet, outletSeed.modifierGroups);
      await seedMenu(outlet, outletSeed.categories, groups);
      const seededUsers = await seedUsersForOutlet(
        outlet,
        outletSeed.emailPrefix,
        outletSeed.phoneSeed,
        piiCrypto,
      );

      outletSummaries.push({
        outlet: outlet.name,
        outletId: outlet.id,
        cuisineType: outlet.cuisineType,
        admins: seededUsers
          .filter((user) => user.role === UserRole.ADMIN)
          .map((user) => user.email),
        users: seededUsers
          .filter((user) => user.role === UserRole.CUSTOMER)
          .map((user) => user.email),
        categories: outletSeed.categories.map((category) => category.name),
        menuItems: outletSeed.categories.flatMap((category) =>
          category.items.map((item) => item.name),
        ),
        modifierGroups: outletSeed.modifierGroups.map((group) => group.name),
        modifiers: outletSeed.modifierGroups.flatMap((group) =>
          group.modifiers.map((modifier) => modifier.name),
        ),
      });
      userSummaries.push(...seededUsers);

      console.log(`Seeded outlet ${outletIndex + 1}: ${outlet.name} (${outlet.id})`);
    }

    printSeedSummary(outletSummaries, userSummaries);
  } finally {
    await dataSource.destroy();
  }
}

async function upsertOutlet(seed: (typeof outlets)[number]): Promise<Outlet> {
  const outletsRepository = dataSource.getRepository(Outlet);
  const outlet =
    (await outletsRepository.findOneBy({ momentSubaccountCode: seed.momentSubaccountCode })) ??
    outletsRepository.create({ momentSubaccountCode: seed.momentSubaccountCode });

  outlet.name = seed.name;
  outlet.description = seed.description;
  outlet.cuisineType = seed.cuisineType;
  outlet.imageUrl = seed.imageUrl;
  outlet.isOnline = true;

  return outletsRepository.save(outlet);
}

async function seedUsersForOutlet(
  outlet: Outlet,
  emailPrefix: string,
  phoneSeed: number,
  piiCrypto: PiiCryptoService,
): Promise<SeededUserSummary[]> {
  const users = await Promise.all([
    seedUser({
      name: `${outlet.name} Admin One`,
      email: `${emailPrefix}.admin1@yopmail.com`,
      phone: `080${phoneSeed}001`,
      role: UserRole.ADMIN,
      outletId: outlet.id,
      piiCrypto,
    }),
    seedUser({
      name: `${outlet.name} Admin Two`,
      email: `${emailPrefix}.admin2@yopmail.com`,
      phone: `080${phoneSeed}002`,
      role: UserRole.ADMIN,
      outletId: outlet.id,
      piiCrypto,
    }),
    seedUser({
      name: `${outlet.name} User One`,
      email: `${emailPrefix}.user1@yopmail.com`,
      phone: `080${phoneSeed}101`,
      role: UserRole.CUSTOMER,
      outletId: null,
      piiCrypto,
    }),
    seedUser({
      name: `${outlet.name} User Two`,
      email: `${emailPrefix}.user2@yopmail.com`,
      phone: `080${phoneSeed}102`,
      role: UserRole.CUSTOMER,
      outletId: null,
      piiCrypto,
    }),
  ]);

  return users.map(({ user, email, phone }) => ({
    role: user.role as UserRole.ADMIN | UserRole.CUSTOMER,
    name: user.name,
    email,
    phone,
    password: defaultPassword,
    outlet: outlet.name,
  }));
}

async function seedUser(input: {
  name: string;
  email: string;
  phone: string;
  role: UserRole.ADMIN | UserRole.CUSTOMER;
  outletId: string | null;
  piiCrypto: PiiCryptoService;
}): Promise<{ user: Customer; email: string; phone: string }> {
  const users = dataSource.getRepository(Customer);
  const email = input.email.trim().toLowerCase();
  const phone = normalizeNigerianPhoneNumber(input.phone);
  const emailHash = input.piiCrypto.searchHash(email);
  const phoneHash = input.piiCrypto.searchHash(phone);
  const now = new Date();
  const user =
    (await users.findOneBy({ emailHash })) ??
    users.create({
      emailHash,
      phoneHash,
      createdAt: now,
    });

  user.name = input.name;
  user.emailEncrypted = input.piiCrypto.encrypt(email);
  user.emailHash = emailHash;
  user.phoneEncrypted = input.piiCrypto.encrypt(phone);
  user.phoneHash = phoneHash;
  user.passwordHash = await hashPassword(defaultPassword);
  user.status = CustomerStatus.ACTIVE;
  user.role = input.role;
  user.outletId = input.outletId;
  user.emailVerifiedAt = now;
  user.phoneVerifiedAt = now;

  return { user: await users.save(user), email, phone };
}

async function seedModifierGroups(
  outlet: Outlet,
  seeds: (typeof outlets)[number]["modifierGroups"],
): Promise<ItemModifierGroup[]> {
  const groupsRepository = dataSource.getRepository(ItemModifierGroup);
  const modifiersRepository = dataSource.getRepository(ItemModifier);
  const groups: ItemModifierGroup[] = [];

  for (const [groupIndex, groupSeed] of seeds.entries()) {
    const group =
      (await groupsRepository.findOneBy({ outletId: outlet.id, name: groupSeed.name })) ??
      groupsRepository.create({ outletId: outlet.id, name: groupSeed.name });

    group.minSelections = groupSeed.minSelections;
    group.maxSelections = groupSeed.maxSelections;
    group.isRequired = groupSeed.minSelections > 0;
    group.sortOrder = groupIndex;

    const savedGroup = await groupsRepository.save(group);
    groups.push(savedGroup);

    for (const [modifierIndex, modifierSeed] of groupSeed.modifiers.entries()) {
      const modifier =
        (await modifiersRepository.findOneBy({
          outletId: outlet.id,
          groupId: savedGroup.id,
          name: modifierSeed.name,
        })) ??
        modifiersRepository.create({
          outletId: outlet.id,
          groupId: savedGroup.id,
          name: modifierSeed.name,
        });

      modifier.priceDeltaMinor = modifierSeed.priceDeltaMinor;
      modifier.currency = "NGN";
      modifier.isAvailable = true;
      modifier.sortOrder = modifierIndex;

      await modifiersRepository.save(modifier);
    }
  }

  return groups;
}

async function seedMenu(
  outlet: Outlet,
  categorySeeds: (typeof outlets)[number]["categories"],
  groups: ItemModifierGroup[],
): Promise<void> {
  const categoriesRepository = dataSource.getRepository(MenuCategory);
  const itemsRepository = dataSource.getRepository(MenuItem);
  const itemGroupsRepository = dataSource.getRepository(MenuItemModifierGroup);

  for (const [categoryIndex, categorySeed] of categorySeeds.entries()) {
    const category =
      (await categoriesRepository.findOneBy({ outletId: outlet.id, name: categorySeed.name })) ??
      categoriesRepository.create({ outletId: outlet.id, name: categorySeed.name });

    category.sortOrder = categoryIndex;
    category.isActive = true;

    const savedCategory = await categoriesRepository.save(category);

    for (const [itemIndex, itemSeed] of categorySeed.items.entries()) {
      const item =
        (await itemsRepository.findOneBy({
          outletId: outlet.id,
          categoryId: savedCategory.id,
          name: itemSeed.name,
        })) ??
        itemsRepository.create({
          outletId: outlet.id,
          categoryId: savedCategory.id,
          name: itemSeed.name,
        });

      item.description = itemSeed.description;
      item.imageUrl = null;
      item.priceMinor = itemSeed.priceMinor;
      item.currency = "NGN";
      item.isAvailable = true;
      item.sortOrder = itemIndex;

      const savedItem = await itemsRepository.save(item);

      for (const [groupIndex, group] of groups.entries()) {
        const link =
          (await itemGroupsRepository.findOneBy({
            menuItemId: savedItem.id,
            groupId: group.id,
          })) ??
          itemGroupsRepository.create({
            menuItemId: savedItem.id,
            groupId: group.id,
          });

        link.sortOrder = groupIndex;
        await itemGroupsRepository.save(link);
      }
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

function printSeedSummary(
  outletSummaries: SeededOutletSummary[],
  userSummaries: SeededUserSummary[],
): void {
  console.log("\nSeeded demo outlets");
  console.table(
    outletSummaries.map((summary) => ({
      outlet: summary.outlet,
      outletId: summary.outletId,
      cuisineType: summary.cuisineType,
      categories: summary.categories.join(", "),
      menuItems: summary.menuItems.join(", "),
      modifierGroups: summary.modifierGroups.join(", "),
      modifiers: summary.modifiers.join(", "),
    })),
  );

  console.log("\nSeeded demo logins");
  console.table(userSummaries);
}
