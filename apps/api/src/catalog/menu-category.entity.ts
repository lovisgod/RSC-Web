import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "menu_categories" })
@Index("ix_menu_categories_outlet", ["outletId"])
export class MenuCategory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "outlet_id", type: "uuid" })
  outletId!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ name: "sort_order", type: "integer", default: 0 })
  sortOrder!: number;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "available_from", type: "time", nullable: true })
  availableFrom!: string | null;

  @Column({ name: "available_until", type: "time", nullable: true })
  availableUntil!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}
