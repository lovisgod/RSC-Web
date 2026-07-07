import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Customer } from "../auth/customer.entity";
import { UserRole } from "../auth/user-role.enum";
import { MediaService, type UploadedImageFile } from "../media/media.service";
import { Outlet } from "../outlets/outlet.entity";
import { RealtimeService } from "../realtime/realtime.service";
import { ItemModifierGroup } from "./item-modifier-group.entity";
import { ItemModifier } from "./item-modifier.entity";
import { MenuCategory } from "./menu-category.entity";
import { MenuItemModifierGroup } from "./menu-item-modifier-group.entity";
import { MenuItemRating } from "./menu-item-rating.entity";
import { OutletRating } from "./outlet-rating.entity";
import { MenuItem } from "./menu-item.entity";
import { PreparationSuggestion } from "./preparation-suggestion.entity";
import type {
  CreateItemModifierDto,
  CreateItemModifierGroupDto,
  CreateMenuCategoryDto,
  CreateMenuItemDto,
  CreateOutletDto,
  ListMenuItemsQueryDto,
  RateMenuItemDto,
  RateOutletDto,
  UpdateItemModifierDto,
  UpdateItemModifierGroupDto,
  UpdateMenuCategoryDto,
  UpdateMenuItemAvailabilityDto,
  UpdateMenuItemDto,
  UpdateOutletOnlineStatusDto,
  UpdateOutletDto,
  CreatePreparationSuggestionDto,
  UpdatePreparationSuggestionDto,
  QueryPreparationSuggestionsDto,
} from "./dto/catalog.dto";

export interface MenuItemsPage {
  items: MenuItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Outlet) private readonly outlets: Repository<Outlet>,
    @InjectRepository(Customer) private readonly users: Repository<Customer>,
    @InjectRepository(MenuCategory) private readonly categories: Repository<MenuCategory>,
    @InjectRepository(MenuItem) private readonly items: Repository<MenuItem>,
    @InjectRepository(MenuItemRating) private readonly ratings: Repository<MenuItemRating>,
    @InjectRepository(OutletRating) private readonly outletRatings: Repository<OutletRating>,
    @InjectRepository(ItemModifierGroup) private readonly groups: Repository<ItemModifierGroup>,
    @InjectRepository(ItemModifier) private readonly modifiers: Repository<ItemModifier>,
    @InjectRepository(MenuItemModifierGroup)
    private readonly itemGroups: Repository<MenuItemModifierGroup>,
    @InjectRepository(PreparationSuggestion)
    private readonly preparationSuggestions: Repository<PreparationSuggestion>,
    private readonly media: MediaService,
    private readonly realtime: RealtimeService,
  ) {}

  async listOutlets(user: AuthenticatedUser): Promise<Outlet[]> {
    if (user.role === UserRole.SUPER_ADMIN) {
      return this.outlets.find({ order: { name: "ASC" } });
    }

    const outletId = await this.requireAdminOutletId(user);

    return [await this.requireOutlet(outletId)];
  }

  async getOutlet(user: AuthenticatedUser, id: string): Promise<Outlet> {
    await this.ensureOutletAccess(user, id);
    return this.requireOutlet(id);
  }

  async listPublicOutlets(): Promise<PublicOutletCatalog[]> {
    const outlets = await this.outlets.find({ order: { name: "ASC" } });

    return this.attachPublicCatalog(outlets);
  }

  async getPublicOutlet(id: string): Promise<PublicOutletCatalog> {
    const outlet = await this.requireOutlet(id);
    const [catalog] = await this.attachPublicCatalog([outlet]);

    return catalog!;
  }

  async createOutlet(input: CreateOutletDto): Promise<Outlet> {
    return this.outlets.save(
      this.outlets.create({
        name: input.name,
        description: input.description ?? null,
        address: input.address ?? null,
        cuisineType: input.cuisineType,
        imageUrl: input.imageUrl ?? null,
        isOnline: input.isOnline ?? true,
        vatBps: input.vatBps ?? 0,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        deliveryRadiusKm: input.deliveryRadiusKm ?? 15,
        momentSubaccountCode: input.momentSubaccountCode,
      }),
    );
  }

  async updateOutlet(user: AuthenticatedUser, id: string, input: UpdateOutletDto): Promise<Outlet> {
    await this.ensureOutletAccess(user, id);
    const outlet = await this.requireOutlet(id);

    if (user.role !== UserRole.SUPER_ADMIN && input.isOnline !== undefined) {
      throw new ForbiddenException("Only super admins can change outlet online status");
    }

    Object.assign(outlet, {
      ...input,
      description: input.description === undefined ? outlet.description : input.description,
      address: input.address === undefined ? outlet.address : input.address,
      imageUrl: input.imageUrl === undefined ? outlet.imageUrl : input.imageUrl,
    });

    return this.outlets.save(outlet);
  }

  async updateOutletOnlineStatus(id: string, input: UpdateOutletOnlineStatusDto): Promise<Outlet> {
    const outlet = await this.requireOutlet(id);
    outlet.isOnline = input.isOnline;
    const saved = await this.outlets.save(outlet);

    this.realtime.emitOutletStatusUpdate({
      outletId: saved.id,
      isOnline: saved.isOnline,
      updatedAt: saved.updatedAt,
    });

    return saved;
  }

  async deleteOutlet(id: string): Promise<{ deleted: true }> {
    const outlet = await this.requireOutlet(id);
    await this.outlets.softRemove(outlet);

    return { deleted: true };
  }

  async listCategories(user: AuthenticatedUser, outletId?: string): Promise<MenuCategory[]> {
    const scopedOutletId = await this.resolveOutletId(user, outletId);

    return this.categories.find({
      where: { outletId: scopedOutletId },
      order: { sortOrder: "ASC", name: "ASC" },
    });
  }

  async listPublicCategories(outletId?: string): Promise<MenuCategory[]> {
    return this.categories.find({
      ...(outletId ? { where: { outletId } } : {}),
      order: { sortOrder: "ASC", name: "ASC" },
    });
  }

  async createCategory(
    user: AuthenticatedUser,
    input: CreateMenuCategoryDto,
  ): Promise<MenuCategory> {
    const outletId = await this.resolveOutletId(user, input.outletId);

    return this.categories.save(
      this.categories.create({
        outletId,
        name: input.name,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      }),
    );
  }

  async getCategory(user: AuthenticatedUser, id: string): Promise<MenuCategory> {
    const category = await this.requireCategory(id);
    await this.ensureOutletAccess(user, category.outletId);

    return category;
  }

  async getPublicCategory(id: string): Promise<MenuCategory> {
    return this.requireCategory(id);
  }

  async updateCategory(
    user: AuthenticatedUser,
    id: string,
    input: UpdateMenuCategoryDto,
  ): Promise<MenuCategory> {
    const category = await this.getCategory(user, id);

    if (input.outletId && input.outletId !== category.outletId) {
      throw new ForbiddenException("Cannot move a category across outlets");
    }

    Object.assign(category, input);

    return this.categories.save(category);
  }

  async deleteCategory(user: AuthenticatedUser, id: string): Promise<{ deleted: true }> {
    const category = await this.getCategory(user, id);
    await this.categories.softRemove(category);

    return { deleted: true };
  }

  async listItems(user: AuthenticatedUser, outletId?: string): Promise<MenuItem[]> {
    const scopedOutletId = await this.resolveOutletId(user, outletId);

    return this.items.find({
      where: { outletId: scopedOutletId },
      order: { sortOrder: "ASC", name: "ASC" },
    });
  }

  async listPublicItems(query: ListMenuItemsQueryDto = {}): Promise<MenuItem[]> {
    const { items } = await this.queryPublicItems(query);

    return items;
  }

  async listPublicItemsPage(query: ListMenuItemsQueryDto = {}): Promise<MenuItemsPage> {
    return this.queryPublicItems(query);
  }

  async createItem(user: AuthenticatedUser, input: CreateMenuItemDto): Promise<MenuItem> {
    const outletId = await this.resolveOutletId(user, input.outletId);
    await this.ensureCategoryInOutlet(input.categoryId, outletId);
    await this.ensureGroupsInOutlet(input.modifierGroupIds ?? [], outletId);

    const item = await this.items.save(
      this.items.create({
        outletId,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        deliveryTimeRange: input.deliveryTimeRange ?? null,
        priceMinor: input.priceMinor,
        currency: "NGN",
        isAvailable: input.isAvailable ?? true,
        sortOrder: input.sortOrder ?? 0,
      }),
    );
    await this.replaceItemGroups(item.id, input.modifierGroupIds ?? []);

    return item;
  }

  async getItem(user: AuthenticatedUser, id: string): Promise<MenuItem> {
    const item = await this.requireItem(id);
    await this.ensureOutletAccess(user, item.outletId);

    return item;
  }

  async getPublicItem(id: string): Promise<MenuItem> {
    return this.requireItem(id);
  }

  async updateItem(
    user: AuthenticatedUser,
    id: string,
    input: UpdateMenuItemDto,
  ): Promise<MenuItem> {
    const item = await this.getItem(user, id);

    if (input.outletId && input.outletId !== item.outletId) {
      throw new ForbiddenException("Cannot move a menu item across outlets");
    }

    if (input.categoryId) {
      await this.ensureCategoryInOutlet(input.categoryId, item.outletId);
    }

    if (input.modifierGroupIds) {
      await this.ensureGroupsInOutlet(input.modifierGroupIds, item.outletId);
      await this.replaceItemGroups(item.id, input.modifierGroupIds);
    }

    const wasAvailable = item.isAvailable;

    Object.assign(item, {
      ...input,
      description: input.description === undefined ? item.description : input.description,
      imageUrl: input.imageUrl === undefined ? item.imageUrl : input.imageUrl,
      deliveryTimeRange:
        input.deliveryTimeRange === undefined ? item.deliveryTimeRange : input.deliveryTimeRange,
    });
    delete (item as Partial<MenuItem> & { modifierGroupIds?: string[] }).modifierGroupIds;

    const saved = await this.items.save(item);

    if (wasAvailable !== saved.isAvailable) {
      this.realtime.emitMenuItemAvailabilityUpdate({
        menuItemId: saved.id,
        outletId: saved.outletId,
        isAvailable: saved.isAvailable,
        updatedAt: saved.updatedAt,
      });
    }

    return saved;
  }

  async updateItemAvailability(
    user: AuthenticatedUser,
    id: string,
    input: UpdateMenuItemAvailabilityDto,
  ): Promise<MenuItem> {
    const item = await this.getItem(user, id);
    const wasAvailable = item.isAvailable;
    item.isAvailable = input.isAvailable;

    const saved = await this.items.save(item);

    if (wasAvailable !== saved.isAvailable) {
      this.realtime.emitMenuItemAvailabilityUpdate({
        menuItemId: saved.id,
        outletId: saved.outletId,
        isAvailable: saved.isAvailable,
        updatedAt: saved.updatedAt,
      });
    }

    return saved;
  }

  async uploadItemImage(
    user: AuthenticatedUser,
    id: string,
    file: UploadedImageFile,
  ): Promise<MenuItem> {
    const item = await this.getItem(user, id);
    const upload = await this.media.uploadImage({
      file,
      folder: "menu-items",
      publicIdPrefix: item.id,
    });

    item.imageUrl = upload.url;

    return this.items.save(item);
  }

  async rateItem(user: AuthenticatedUser, id: string, input: RateMenuItemDto): Promise<MenuItem> {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException("Only customers can rate menu items");
    }

    const item = await this.requireItem(id);
    const existing = await this.ratings.findOneBy({ menuItemId: id, customerId: user.id });

    const rating = existing ?? this.ratings.create({ menuItemId: id, customerId: user.id });
    rating.rating = input.rating;
    rating.comment = input.comment ?? null;

    await this.ratings.save(rating);

    const aggregate = await this.ratings
      .createQueryBuilder("rating")
      .select("AVG(rating.rating)", "average")
      .addSelect("COUNT(rating.id)", "count")
      .where("rating.menuItemId = :id", { id })
      .getRawOne<{ average: string | null; count: string }>();

    item.ratingAverage = Number(aggregate?.average ?? 0).toFixed(2);
    item.ratingCount = Number(aggregate?.count ?? 0);
    await this.items.save(item);

    return this.getPublicItem(id);
  }

  async rateOutlet(
    user: AuthenticatedUser,
    id: string,
    input: RateOutletDto,
  ): Promise<PublicOutletCatalog> {
    if (user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException("Only customers can rate outlets");
    }

    const outlet = await this.requireOutlet(id);
    const existing = await this.outletRatings.findOneBy({ outletId: id, customerId: user.id });

    const rating = existing ?? this.outletRatings.create({ outletId: id, customerId: user.id });
    rating.rating = input.rating;
    rating.comment = input.comment ?? null;

    await this.outletRatings.save(rating);

    const aggregate = await this.outletRatings
      .createQueryBuilder("rating")
      .select("AVG(rating.rating)", "average")
      .addSelect("COUNT(rating.id)", "count")
      .where("rating.outletId = :id", { id })
      .getRawOne<{ average: string | null; count: string }>();

    outlet.ratingAverage = Number(aggregate?.average ?? 0).toFixed(2);
    outlet.ratingCount = Number(aggregate?.count ?? 0);
    await this.outlets.save(outlet);

    return this.getPublicOutlet(id);
  }

  async deleteItem(user: AuthenticatedUser, id: string): Promise<{ deleted: true }> {
    const item = await this.getItem(user, id);
    await this.items.softRemove(item);

    return { deleted: true };
  }

  async listGroups(user: AuthenticatedUser, outletId?: string): Promise<ItemModifierGroup[]> {
    const scopedOutletId = await this.resolveOutletId(user, outletId);

    return this.groups.find({
      where: { outletId: scopedOutletId },
      order: { sortOrder: "ASC", name: "ASC" },
    });
  }

  async listPublicGroups(outletId?: string): Promise<ItemModifierGroup[]> {
    return this.groups.find({
      ...(outletId ? { where: { outletId } } : {}),
      order: { sortOrder: "ASC", name: "ASC" },
    });
  }

  async createGroup(
    user: AuthenticatedUser,
    input: CreateItemModifierGroupDto,
  ): Promise<ItemModifierGroup> {
    const outletId = await this.resolveOutletId(user, input.outletId);

    return this.groups.save(
      this.groups.create({
        outletId,
        name: input.name,
        minSelections: input.minSelections ?? 0,
        maxSelections: input.maxSelections ?? 1,
        isRequired: input.isRequired ?? false,
        sortOrder: input.sortOrder ?? 0,
      }),
    );
  }

  async getGroup(user: AuthenticatedUser, id: string): Promise<ItemModifierGroup> {
    const group = await this.requireGroup(id);
    await this.ensureOutletAccess(user, group.outletId);

    return group;
  }

  async getPublicGroup(id: string): Promise<ItemModifierGroup> {
    return this.requireGroup(id);
  }

  async updateGroup(
    user: AuthenticatedUser,
    id: string,
    input: UpdateItemModifierGroupDto,
  ): Promise<ItemModifierGroup> {
    const group = await this.getGroup(user, id);

    if (input.outletId && input.outletId !== group.outletId) {
      throw new ForbiddenException("Cannot move a modifier group across outlets");
    }

    Object.assign(group, input);

    return this.groups.save(group);
  }

  async deleteGroup(user: AuthenticatedUser, id: string): Promise<{ deleted: true }> {
    const group = await this.getGroup(user, id);
    await this.groups.softRemove(group);

    return { deleted: true };
  }

  async listModifiers(user: AuthenticatedUser, outletId?: string): Promise<ItemModifier[]> {
    const scopedOutletId = await this.resolveOutletId(user, outletId);

    return this.modifiers.find({
      where: { outletId: scopedOutletId },
      order: { sortOrder: "ASC", name: "ASC" },
    });
  }

  async listPublicModifiers(outletId?: string): Promise<ItemModifier[]> {
    return this.modifiers.find({
      ...(outletId ? { where: { outletId } } : {}),
      order: { sortOrder: "ASC", name: "ASC" },
    });
  }

  async createModifier(
    user: AuthenticatedUser,
    input: CreateItemModifierDto,
  ): Promise<ItemModifier> {
    const outletId = await this.resolveOutletId(user, input.outletId);
    await this.ensureGroupInOutlet(input.groupId, outletId);

    return this.modifiers.save(
      this.modifiers.create({
        outletId,
        groupId: input.groupId,
        name: input.name,
        priceDeltaMinor: input.priceDeltaMinor ?? 0,
        currency: "NGN",
        isAvailable: input.isAvailable ?? true,
        sortOrder: input.sortOrder ?? 0,
      }),
    );
  }

  async getModifier(user: AuthenticatedUser, id: string): Promise<ItemModifier> {
    const modifier = await this.requireModifier(id);
    await this.ensureOutletAccess(user, modifier.outletId);

    return modifier;
  }

  async getPublicModifier(id: string): Promise<ItemModifier> {
    return this.requireModifier(id);
  }

  async updateModifier(
    user: AuthenticatedUser,
    id: string,
    input: UpdateItemModifierDto,
  ): Promise<ItemModifier> {
    const modifier = await this.getModifier(user, id);

    if (input.outletId && input.outletId !== modifier.outletId) {
      throw new ForbiddenException("Cannot move a modifier across outlets");
    }

    if (input.groupId) {
      await this.ensureGroupInOutlet(input.groupId, modifier.outletId);
    }

    Object.assign(modifier, input);

    return this.modifiers.save(modifier);
  }

  async deleteModifier(user: AuthenticatedUser, id: string): Promise<{ deleted: true }> {
    const modifier = await this.getModifier(user, id);
    await this.modifiers.softRemove(modifier);

    return { deleted: true };
  }

  private async resolveOutletId(
    user: AuthenticatedUser,
    requestedOutletId?: string,
  ): Promise<string> {
    if (user.role === UserRole.SUPER_ADMIN) {
      if (!requestedOutletId) {
        throw new ForbiddenException("outletId is required for this operation");
      }
      await this.requireOutlet(requestedOutletId);
      return requestedOutletId;
    }

    return this.requireAdminOutletId(user, requestedOutletId);
  }

  private async requireAdminOutletId(
    user: AuthenticatedUser,
    requestedOutletId?: string,
  ): Promise<string> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Outlet admin access is required");
    }

    const admin = await this.users.findOne({
      where: { id: user.id, role: UserRole.ADMIN },
      select: { id: true, outletId: true },
    });

    if (!admin?.outletId) {
      throw new ForbiddenException("Outlet admin is not linked to an outlet");
    }

    if (requestedOutletId && requestedOutletId !== admin.outletId) {
      throw new ForbiddenException("Cannot access another outlet");
    }

    return admin.outletId;
  }

  private async ensureOutletAccess(user: AuthenticatedUser, outletId: string): Promise<void> {
    if (user.role === UserRole.SUPER_ADMIN) {
      return;
    }

    await this.requireAdminOutletId(user, outletId);
  }

  private async queryPublicItems(query: ListMenuItemsQueryDto): Promise<MenuItemsPage> {
    const limit = query.limit ?? 30;
    const offset = query.offset ?? 0;
    const itemQuery = this.items
      .createQueryBuilder("item")
      .orderBy("item.sortOrder", "ASC")
      .addOrderBy("item.name", "ASC")
      .take(limit)
      .skip(offset);

    if (query.outletId) {
      itemQuery.andWhere("item.outletId = :outletId", { outletId: query.outletId });
    }

    const search = query.q?.trim();

    if (search) {
      itemQuery.andWhere("(item.name ILIKE :search OR item.description ILIKE :search)", {
        search: `%${search}%`,
      });
    }

    const [items, total] = await itemQuery.getManyAndCount();

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  private async requireOutlet(id: string): Promise<Outlet> {
    const outlet = await this.outlets.findOneBy({ id });

    if (!outlet) {
      throw new NotFoundException("Outlet not found");
    }

    return outlet;
  }

  private async requireCategory(id: string): Promise<MenuCategory> {
    const category = await this.categories.findOneBy({ id });

    if (!category) {
      throw new NotFoundException("Menu category not found");
    }

    return category;
  }

  private async requireItem(id: string): Promise<MenuItem> {
    const item = await this.items.findOneBy({ id });

    if (!item) {
      throw new NotFoundException("Menu item not found");
    }

    return item;
  }

  private async requireGroup(id: string): Promise<ItemModifierGroup> {
    const group = await this.groups.findOneBy({ id });

    if (!group) {
      throw new NotFoundException("Modifier group not found");
    }

    return group;
  }

  private async requireModifier(id: string): Promise<ItemModifier> {
    const modifier = await this.modifiers.findOneBy({ id });

    if (!modifier) {
      throw new NotFoundException("Modifier not found");
    }

    return modifier;
  }

  private async ensureCategoryInOutlet(categoryId: string, outletId: string): Promise<void> {
    const category = await this.categories.findOneBy({ id: categoryId, outletId });

    if (!category) {
      throw new ForbiddenException("Menu category does not belong to this outlet");
    }
  }

  private async ensureGroupInOutlet(groupId: string, outletId: string): Promise<void> {
    const group = await this.groups.findOneBy({ id: groupId, outletId });

    if (!group) {
      throw new ForbiddenException("Modifier group does not belong to this outlet");
    }
  }

  private async ensureGroupsInOutlet(groupIds: string[], outletId: string): Promise<void> {
    if (!groupIds.length) {
      return;
    }

    const count = await this.groups.countBy({ id: In(groupIds), outletId });

    if (count !== groupIds.length) {
      throw new ForbiddenException("One or more modifier groups do not belong to this outlet");
    }
  }

  private async replaceItemGroups(menuItemId: string, groupIds: string[]): Promise<void> {
    await this.itemGroups.delete({ menuItemId });
    await this.itemGroups.save(
      groupIds.map((groupId, index) =>
        this.itemGroups.create({ menuItemId, groupId, sortOrder: index }),
      ),
    );
  }

  private async attachPublicCatalog(outlets: Outlet[]): Promise<PublicOutletCatalog[]> {
    if (!outlets.length) {
      return [];
    }

    const outletIds = outlets.map((outlet) => outlet.id);
    const [menuCategories, menuItems, itemModifierGroups, itemModifiers] = await Promise.all([
      this.categories.find({
        where: { outletId: In(outletIds), isActive: true },
        order: { sortOrder: "ASC", name: "ASC" },
      }),
      this.items.find({
        where: { outletId: In(outletIds) },
        order: { sortOrder: "ASC", name: "ASC" },
      }),
      this.groups.find({
        where: { outletId: In(outletIds) },
        order: { sortOrder: "ASC", name: "ASC" },
      }),
      this.modifiers.find({
        where: { outletId: In(outletIds) },
        order: { sortOrder: "ASC", name: "ASC" },
      }),
    ]);
    const menuItemIds = menuItems.map((item) => item.id);
    const menuItemModifierGroups = menuItemIds.length
      ? await this.itemGroups.find({
          where: { menuItemId: In(menuItemIds) },
          order: { sortOrder: "ASC" },
        })
      : [];

    return outlets.map((outlet) => ({
      ...outlet,
      menuCategories: menuCategories.filter((category) => category.outletId === outlet.id),
      menuItems: menuItems.filter((item) => item.outletId === outlet.id),
      itemModifierGroups: itemModifierGroups.filter((group) => group.outletId === outlet.id),
      itemModifiers: itemModifiers.filter((modifier) => modifier.outletId === outlet.id),
      menuItemModifierGroups: menuItemModifierGroups.filter((itemGroup) =>
        menuItems.some((item) => item.id === itemGroup.menuItemId && item.outletId === outlet.id),
      ),
    }));
  }

  async listPreparationSuggestions(
    query: QueryPreparationSuggestionsDto,
  ): Promise<PreparationSuggestion[]> {
    const qb = this.preparationSuggestions
      .createQueryBuilder("suggestion")
      .where("suggestion.isActive = true");

    if (query.outletId) {
      qb.andWhere("(suggestion.outletId IS NULL OR suggestion.outletId = :outletId)", {
        outletId: query.outletId,
      });
    } else {
      qb.andWhere("suggestion.outletId IS NULL");
    }

    if (query.menuItemId) {
      qb.andWhere("(suggestion.menuItemId IS NULL OR suggestion.menuItemId = :menuItemId)", {
        menuItemId: query.menuItemId,
      });
    } else {
      qb.andWhere("suggestion.menuItemId IS NULL");
    }

    if (query.q) {
      qb.andWhere("suggestion.text ILIKE :search", { search: `%${query.q}%` });
    }

    return qb.orderBy("suggestion.sortOrder", "ASC").addOrderBy("suggestion.text", "ASC").getMany();
  }

  async listPreparationSuggestionsAdmin(
    query: QueryPreparationSuggestionsDto,
  ): Promise<PreparationSuggestion[]> {
    const qb = this.preparationSuggestions.createQueryBuilder("suggestion");

    if (query.outletId) {
      qb.andWhere("suggestion.outletId = :outletId", { outletId: query.outletId });
    }
    if (query.menuItemId) {
      qb.andWhere("suggestion.menuItemId = :menuItemId", { menuItemId: query.menuItemId });
    }
    if (query.q) {
      qb.andWhere("suggestion.text ILIKE :search", { search: `%${query.q}%` });
    }

    return qb.orderBy("suggestion.sortOrder", "ASC").addOrderBy("suggestion.text", "ASC").getMany();
  }

  async createPreparationSuggestion(
    input: CreatePreparationSuggestionDto,
  ): Promise<PreparationSuggestion> {
    const suggestion = this.preparationSuggestions.create({
      text: input.text,
      outletId: input.outletId ?? null,
      menuItemId: input.menuItemId ?? null,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    });
    const saved = await this.preparationSuggestions.save(suggestion);
    this.realtime.emitPreparationSuggestionCreated(saved);
    return saved;
  }

  async updatePreparationSuggestion(
    id: string,
    input: UpdatePreparationSuggestionDto,
  ): Promise<PreparationSuggestion> {
    const suggestion = await this.preparationSuggestions.findOneBy({ id });
    if (!suggestion) {
      throw new NotFoundException("Preparation suggestion not found");
    }

    Object.assign(suggestion, {
      ...input,
      outletId: input.outletId === undefined ? suggestion.outletId : input.outletId,
      menuItemId: input.menuItemId === undefined ? suggestion.menuItemId : input.menuItemId,
    });

    const saved = await this.preparationSuggestions.save(suggestion);
    this.realtime.emitPreparationSuggestionUpdated(saved);
    return saved;
  }

  async deletePreparationSuggestion(id: string): Promise<{ deleted: true }> {
    const suggestion = await this.preparationSuggestions.findOneBy({ id });
    if (!suggestion) {
      throw new NotFoundException("Preparation suggestion not found");
    }
    await this.preparationSuggestions.remove(suggestion);
    this.realtime.emitPreparationSuggestionDeleted(id);
    return { deleted: true };
  }
}

export interface PublicOutletCatalog extends Outlet {
  menuCategories: MenuCategory[];
  menuItems: MenuItem[];
  itemModifierGroups: ItemModifierGroup[];
  itemModifiers: ItemModifier[];
  menuItemModifierGroups: MenuItemModifierGroup[];
}
