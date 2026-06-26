import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "item_modifier_groups" })
@Index("ix_item_modifier_groups_outlet", ["outletId"])
export class ItemModifierGroup {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "outlet_id", type: "uuid" })
  outletId!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ name: "min_selections", type: "integer", default: 0 })
  minSelections!: number;

  @Column({ name: "max_selections", type: "integer", default: 1 })
  maxSelections!: number;

  @Column({ name: "is_required", type: "boolean", default: false })
  isRequired!: boolean;

  @Column({ name: "sort_order", type: "integer", default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}
