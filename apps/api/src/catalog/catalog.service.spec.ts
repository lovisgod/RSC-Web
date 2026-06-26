import { ForbiddenException } from "@nestjs/common";
import type { Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Customer } from "../auth/customer.entity";
import { UserRole } from "../auth/user-role.enum";
import { Outlet } from "../outlets/outlet.entity";
import { CatalogService } from "./catalog.service";
import { ItemModifierGroup } from "./item-modifier-group.entity";
import { ItemModifier } from "./item-modifier.entity";
import { MenuCategory } from "./menu-category.entity";
import { MenuItemModifierGroup } from "./menu-item-modifier-group.entity";
import { MenuItem } from "./menu-item.entity";

describe(CatalogService.name, () => {
  const outletId = "4273e96c-2887-49a5-a6d5-269f007f04f0";
  const otherOutletId = "9e870f94-0ffd-47a7-a23f-8535280b2fe6";
  const adminUser = {
    id: "b709c9f9-7d01-4d84-90d6-50b0ad470bc5",
    role: UserRole.ADMIN,
    sessionId: "session-id",
    accessTokenId: "access-token-id",
  };
  let users: { findOne: ReturnType<typeof vi.fn> };
  let outlets: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    softRemove: ReturnType<typeof vi.fn>;
  };
  let categories: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    softRemove: ReturnType<typeof vi.fn>;
  };
  let items: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    softRemove: ReturnType<typeof vi.fn>;
  };
  let groups: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    softRemove: ReturnType<typeof vi.fn>;
    countBy: ReturnType<typeof vi.fn>;
  };
  let modifiers: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    softRemove: ReturnType<typeof vi.fn>;
  };
  let itemGroups: {
    delete: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let service: CatalogService;

  beforeEach(() => {
    users = {
      findOne: vi
        .fn()
        .mockResolvedValue(Object.assign(new Customer(), { id: adminUser.id, outletId })),
    };
    outlets = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn(({ id }: { id: string }) =>
        Promise.resolve(Object.assign(new Outlet(), { id, name: "Outlet" })),
      ),
      create: vi.fn((value: Partial<Outlet>) => Object.assign(new Outlet(), value)),
      save: vi.fn((value: Outlet) => Promise.resolve(value)),
      softRemove: vi.fn().mockResolvedValue(undefined),
    };
    categories = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue(
        Object.assign(new MenuCategory(), {
          id: "35df7fe2-f6cd-483e-a0a2-b2331c4f4fb9",
          outletId,
        }),
      ),
      create: vi.fn((value: Partial<MenuCategory>) => Object.assign(new MenuCategory(), value)),
      save: vi.fn((value: MenuCategory) => Promise.resolve(value)),
      softRemove: vi.fn().mockResolvedValue(undefined),
    };
    items = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue(
        Object.assign(new MenuItem(), {
          id: "45ef3252-b96f-4308-b40e-391623b25ac9",
          outletId,
          isAvailable: true,
        }),
      ),
      create: vi.fn((value: Partial<MenuItem>) => Object.assign(new MenuItem(), value)),
      save: vi.fn((value: MenuItem) => Promise.resolve(value)),
      softRemove: vi.fn().mockResolvedValue(undefined),
    };
    groups = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue(Object.assign(new ItemModifierGroup(), { outletId })),
      create: vi.fn((value: Partial<ItemModifierGroup>) =>
        Object.assign(new ItemModifierGroup(), value),
      ),
      save: vi.fn((value: ItemModifierGroup) => Promise.resolve(value)),
      softRemove: vi.fn().mockResolvedValue(undefined),
      countBy: vi.fn().mockResolvedValue(0),
    };
    modifiers = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue(Object.assign(new ItemModifier(), { outletId })),
      create: vi.fn((value: Partial<ItemModifier>) => Object.assign(new ItemModifier(), value)),
      save: vi.fn((value: ItemModifier) => Promise.resolve(value)),
      softRemove: vi.fn().mockResolvedValue(undefined),
    };
    itemGroups = {
      delete: vi.fn().mockResolvedValue(undefined),
      create: vi.fn((value: Partial<MenuItemModifierGroup>) =>
        Object.assign(new MenuItemModifierGroup(), value),
      ),
      save: vi.fn().mockResolvedValue(undefined),
    };
    service = new CatalogService(
      outlets as unknown as Repository<Outlet>,
      users as unknown as Repository<Customer>,
      categories as unknown as Repository<MenuCategory>,
      items as unknown as Repository<MenuItem>,
      groups as unknown as Repository<ItemModifierGroup>,
      modifiers as unknown as Repository<ItemModifier>,
      itemGroups as unknown as Repository<MenuItemModifierGroup>,
    );
  });

  it("blocks outlet admins from reading another outlet's category", async () => {
    categories.findOneBy.mockResolvedValueOnce(
      Object.assign(new MenuCategory(), {
        id: "35df7fe2-f6cd-483e-a0a2-b2331c4f4fb9",
        outletId: otherOutletId,
      }),
    );

    await expect(
      service.getCategory(adminUser, "35df7fe2-f6cd-483e-a0a2-b2331c4f4fb9"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("blocks outlet admins from writing another outlet's menu item", async () => {
    items.findOneBy.mockResolvedValueOnce(
      Object.assign(new MenuItem(), {
        id: "45ef3252-b96f-4308-b40e-391623b25ac9",
        outletId: otherOutletId,
        isAvailable: true,
      }),
    );

    await expect(
      service.updateItem(adminUser, "45ef3252-b96f-4308-b40e-391623b25ac9", {
        name: "Updated",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("updates menu item availability immediately for the admin's outlet", async () => {
    const result = await service.updateItemAvailability(
      adminUser,
      "45ef3252-b96f-4308-b40e-391623b25ac9",
      { isAvailable: false },
    );

    expect(result.isAvailable).toBe(false);
    expect(items.save).toHaveBeenCalledWith(expect.objectContaining({ isAvailable: false }));
  });
});
