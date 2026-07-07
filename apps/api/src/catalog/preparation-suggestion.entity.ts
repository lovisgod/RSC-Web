import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "preparation_suggestions" })
@Index("ix_preparation_suggestions_outlet", ["outletId"])
@Index("ix_preparation_suggestions_item", ["menuItemId"])
export class PreparationSuggestion {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  text!: string;

  @Column({ name: "outlet_id", type: "uuid", nullable: true })
  outletId!: string | null;

  @Column({ name: "menu_item_id", type: "uuid", nullable: true })
  menuItemId!: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "sort_order", type: "integer", default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}
