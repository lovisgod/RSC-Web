import { ForbiddenException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Customer } from "../auth/customer.entity";
import { UserRole } from "../auth/user-role.enum";
import type { ApplicationConfig } from "../config/configuration";
import { Outlet } from "../outlets/outlet.entity";
import { CatalogService } from "./catalog.service";
import { ItemModifierGroup } from "./item-modifier-group.entity";
import { ItemModifier } from "./item-modifier.entity";
import { MenuCategory } from "./menu-category.entity";
import { MenuItemModifierGroup } from "./menu-item-modifier-group.entity";
import { MenuItemRating } from "./menu-item-rating.entity";
import { MenuItem } from "./menu-item.entity";
import { OutletRating } from "./outlet-rating.entity";
import type { PreparationSuggestion } from "./preparation-suggestion.entity";

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
  let ratings: {
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  let outletRatings: {
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
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
    find: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let preparationSuggestions: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  let media: { uploadImage: ReturnType<typeof vi.fn> };
  let realtime: {
    emitOutletStatusUpdate: ReturnType<typeof vi.fn>;
    emitMenuItemAvailabilityUpdate: ReturnType<typeof vi.fn>;
  };
  let config: { get: ReturnType<typeof vi.fn> };
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
    ratings = {
      findOneBy: vi.fn().mockResolvedValue(null),
      create: vi.fn((value: Partial<MenuItemRating>) => Object.assign(new MenuItemRating(), value)),
      save: vi.fn((value: MenuItemRating) => Promise.resolve(value)),
      createQueryBuilder: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ average: "5.00", count: "1" }),
      })),
    };
    outletRatings = {
      findOneBy: vi.fn().mockResolvedValue(null),
      create: vi.fn((value: Partial<OutletRating>) => Object.assign(new OutletRating(), value)),
      save: vi.fn((value: OutletRating) => Promise.resolve(value)),
      createQueryBuilder: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ average: "4.50", count: "2" }),
      })),
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
      find: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
      create: vi.fn((value: Partial<MenuItemModifierGroup>) =>
        Object.assign(new MenuItemModifierGroup(), value),
      ),
      save: vi.fn().mockResolvedValue(undefined),
    };
    media = {
      uploadImage: vi.fn().mockResolvedValue({
        url: "https://res.cloudinary.com/rsc/image/upload/menu/item.jpg",
        publicId: "rsc/menu-items/item",
      }),
    };
    realtime = {
      emitOutletStatusUpdate: vi.fn(),
      emitMenuItemAvailabilityUpdate: vi.fn(),
    };
    preparationSuggestions = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue(null),
      create: vi.fn((val: unknown) => val),
      save: vi.fn((val: unknown) => Promise.resolve(val)),
      remove: vi.fn().mockResolvedValue(undefined),
      createQueryBuilder: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      })),
    };
    config = {
      get: vi.fn().mockReturnValue({
        provider: "noop",
        baseUrl: "https://gen.pollinations.ai",
        model: "openai",
        apiKey: "",
        timeoutMs: 500,
      }),
    };
    service = new CatalogService(
      outlets as unknown as Repository<Outlet>,
      users as unknown as Repository<Customer>,
      categories as unknown as Repository<MenuCategory>,
      items as unknown as Repository<MenuItem>,
      ratings as unknown as Repository<MenuItemRating>,
      outletRatings as unknown as Repository<OutletRating>,
      groups as unknown as Repository<ItemModifierGroup>,
      modifiers as unknown as Repository<ItemModifier>,
      itemGroups as unknown as Repository<MenuItemModifierGroup>,
      preparationSuggestions as unknown as Repository<PreparationSuggestion>,
      media as never,
      realtime as never,
      config as unknown as ConfigService<ApplicationConfig, true>,
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
    expect(realtime.emitMenuItemAvailabilityUpdate).toHaveBeenCalledWith({
      menuItemId: "45ef3252-b96f-4308-b40e-391623b25ac9",
      outletId,
      isAvailable: false,
      updatedAt: result.updatedAt,
    });
  });

  it("blocks outlet admins from changing outlet online status through generic updates", async () => {
    await expect(
      service.updateOutlet(adminUser, outletId, { isOnline: false }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("updates outlet online status for the super admin path", async () => {
    const result = await service.updateOutletOnlineStatus(outletId, { isOnline: false });

    expect(result.isOnline).toBe(false);
    expect(outlets.save).toHaveBeenCalledWith(expect.objectContaining({ isOnline: false }));
    expect(realtime.emitOutletStatusUpdate).toHaveBeenCalledWith({
      outletId,
      isOnline: false,
      updatedAt: result.updatedAt,
    });
  });

  it("lets customers rate an outlet and updates the aggregate rating", async () => {
    const customerUser = {
      id: "9bf9dce7-30c1-4a91-b3a4-37143f0e1bf9",
      role: UserRole.CUSTOMER,
      sessionId: "session-id",
      accessTokenId: "access-token-id",
    };

    const result = await service.rateOutlet(customerUser, outletId, {
      rating: 5,
      comment: "Great food",
    });

    expect(outletRatings.save).toHaveBeenCalledWith(
      expect.objectContaining({
        outletId,
        customerId: customerUser.id,
        rating: 5,
        comment: "Great food",
      }),
    );
    expect(outlets.save).toHaveBeenCalledWith(
      expect.objectContaining({ ratingAverage: "4.50", ratingCount: 2 }),
    );
    expect(result.id).toBe(outletId);
  });

  it("prepends AI preparation suggestions when the provider returns valid JSON", async () => {
    const configuredSuggestion = Object.assign({} as PreparationSuggestion, {
      id: "c37fbf84-2e98-4e8a-b2d0-752ec86f1927",
      text: "Pack sauce separately",
      outletId: null,
      menuItemId: null,
      isActive: true,
      sortOrder: 0,
      createdAt: new Date("2026-07-14T10:00:00.000Z"),
      updatedAt: new Date("2026-07-14T10:00:00.000Z"),
      deletedAt: null,
    });
    preparationSuggestions.createQueryBuilder.mockReturnValueOnce({
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([configuredSuggestion]),
    });
    config.get.mockReturnValueOnce({
      provider: "pollinations",
      baseUrl: "https://gen.pollinations.ai",
      model: "openai",
      apiKey: "",
      timeoutMs: 500,
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '["Make it spicy","No onions"]' } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await service.listPreparationSuggestions({ outletId });

    expect(result.map((suggestion) => suggestion.text)).toEqual([
      "Make it spicy",
      "No onions",
      "Pack sauce separately",
    ]);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://text.pollinations.ai/openai",
      expect.objectContaining({ method: "POST" }),
    );

    fetchSpy.mockRestore();
  });

  it("falls back to configured preparation suggestions when AI is unavailable", async () => {
    const configuredSuggestion = Object.assign({} as PreparationSuggestion, {
      id: "c37fbf84-2e98-4e8a-b2d0-752ec86f1927",
      text: "Cut into small pieces",
      outletId: null,
      menuItemId: null,
      isActive: true,
      sortOrder: 0,
      createdAt: new Date("2026-07-14T10:00:00.000Z"),
      updatedAt: new Date("2026-07-14T10:00:00.000Z"),
      deletedAt: null,
    });
    preparationSuggestions.createQueryBuilder.mockReturnValueOnce({
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([configuredSuggestion]),
    });
    config.get.mockReturnValueOnce({
      provider: "pollinations",
      baseUrl: "https://gen.pollinations.ai",
      model: "openai",
      apiKey: "",
      timeoutMs: 500,
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));

    await expect(service.listPreparationSuggestions({ outletId })).resolves.toEqual([
      configuredSuggestion,
    ]);

    fetchSpy.mockRestore();
  });
});
