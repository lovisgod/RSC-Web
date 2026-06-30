import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "item_modifiers" })
@Index("ix_item_modifiers_group", ["groupId"])
@Index("ix_item_modifiers_outlet", ["outletId"])
export class ItemModifier {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "outlet_id", type: "uuid" })
  outletId!: string;

  @Column({ name: "group_id", type: "uuid" })
  groupId!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ name: "price_delta_minor", type: "integer", default: 0 })
  priceDeltaMinor!: number;

  @Column({ type: "char", length: 3, default: "NGN" })
  currency!: "NGN";

  @Column({ name: "is_available", type: "boolean", default: true })
  isAvailable!: boolean;

  @Column({ name: "sort_order", type: "integer", default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}
