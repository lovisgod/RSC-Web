import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Customer } from "../auth/customer.entity";
import { UserRole } from "../auth/user-role.enum";
import { Outlet } from "../outlets/outlet.entity";
import { ItemModifierGroup } from "./item-modifier-group.entity";
import { ItemModifier } from "./item-modifier.entity";
import { MenuCategory } from "./menu-category.entity";
import { MenuItemModifierGroup } from "./menu-item-modifier-group.entity";
import { MenuItem } from "./menu-item.entity";
import type {
  CreateItemModifierDto,
  CreateItemModifierGroupDto,
  CreateMenuCategoryDto,
  CreateMenuItemDto,
  CreateOutletDto,
  UpdateItemModifierDto,
  UpdateItemModifierGroupDto,
  UpdateMenuCategoryDto,
  UpdateMenuItemAvailabilityDto,
  UpdateMenuItemDto,
  UpdateOutletOnlineStatusDto,
  UpdateOutletDto,
} from "./dto/catalog.dto";

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Outlet) private readonly outlets: Repository<Outlet>,
    @InjectRepository(Customer) private readonly users: Repository<Customer>,
    @InjectRepository(MenuCategory) private readonly categories: Repository<MenuCategory>,
    @InjectRepository(MenuItem) private readonly items: Repository<MenuItem>,
    @InjectRepository(ItemModifierGroup) private readonly groups: Repository<ItemModifierGroup>,
    @InjectRepository(ItemModifier) private readonly modifiers: Repository<ItemModifier>,
    @InjectRepository(MenuItemModifierGroup)
    private readonly itemGroups: Repository<MenuItemModifierGroup>,
  ) {}

  async listOutlets(user: AuthenticatedUser): Promise<Outlet[]> {
    if (user.role === UserRole.SUPER_ADMIN) {
      return this.listPublicOutlets();
    }

    const outletId = await this.requireAdminOutletId(user);

    return [await this.requireOutlet(outletId)];
  }

  async getOutlet(user: AuthenticatedUser, id: string): Promise<Outlet> {
    await this.ensureOutletAccess(user, id);
    return this.requireOutlet(id);
  }

  async listPublicOutlets(): Promise<Outlet[]> {
    return this.outlets.find({ order: { name: "ASC" } });
  }

  async getPublicOutlet(id: string): Promise<Outlet> {
    return this.requireOutlet(id);
  }

  async createOutlet(input: CreateOutletDto): Promise<Outlet> {
    return this.outlets.save(
      this.outlets.create({
        name: input.name,
        description: input.description ?? null,
        cuisineType: input.cuisineType,
        imageUrl: input.imageUrl ?? null,
        isOnline: input.isOnline ?? true,
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
      imageUrl: input.imageUrl === undefined ? outlet.imageUrl : input.imageUrl,
    });

    return this.outlets.save(outlet);
  }

  async updateOutletOnlineStatus(id: string, input: UpdateOutletOnlineStatusDto): Promise<Outlet> {
    const outlet = await this.requireOutlet(id);
    outlet.isOnline = input.isOnline;

    return this.outlets.save(outlet);
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

    Object.assign(item, {
      ...input,
      description: input.description === undefined ? item.description : input.description,
      imageUrl: input.imageUrl === undefined ? item.imageUrl : input.imageUrl,
    });
    delete (item as Partial<MenuItem> & { modifierGroupIds?: string[] }).modifierGroupIds;

    return this.items.save(item);
  }

  async updateItemAvailability(
    user: AuthenticatedUser,
    id: string,
    input: UpdateMenuItemAvailabilityDto,
  ): Promise<MenuItem> {
    const item = await this.getItem(user, id);
    item.isAvailable = input.isAvailable;

    return this.items.save(item);
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
}
