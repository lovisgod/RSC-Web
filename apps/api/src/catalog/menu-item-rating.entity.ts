import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "menu_item_ratings" })
@Index("uq_menu_item_ratings_user_item", ["menuItemId", "customerId"], { unique: true })
@Index("ix_menu_item_ratings_item", ["menuItemId"])
export class MenuItemRating {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "menu_item_id", type: "uuid" })
  menuItemId!: string;

  @Column({ name: "customer_id", type: "uuid" })
  customerId!: string;

  @Column({ type: "integer" })
  rating!: number;

  @Column({ type: "text", nullable: true })
  comment!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
