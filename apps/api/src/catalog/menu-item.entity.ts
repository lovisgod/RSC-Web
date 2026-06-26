import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "menu_items" })
@Index("ix_menu_items_outlet", ["outletId"])
@Index("ix_menu_items_category", ["categoryId"])
export class MenuItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "outlet_id", type: "uuid" })
  outletId!: string;

  @Column({ name: "category_id", type: "uuid" })
  categoryId!: string;

  @Column({ length: 160 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ name: "image_url", type: "varchar", length: 512, nullable: true })
  imageUrl!: string | null;

  @Column({ name: "price_minor", type: "integer" })
  priceMinor!: number;

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
