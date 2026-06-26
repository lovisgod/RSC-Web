import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "menu_item_modifier_groups" })
@Index("uq_menu_item_modifier_groups_item_group", ["menuItemId", "groupId"], { unique: true })
export class MenuItemModifierGroup {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "menu_item_id", type: "uuid" })
  menuItemId!: string;

  @Column({ name: "group_id", type: "uuid" })
  groupId!: string;

  @Column({ name: "sort_order", type: "integer", default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
