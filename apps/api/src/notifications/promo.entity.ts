import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type PromoDiscountTarget = "DELIVERY" | "ORDER";
export type PromoScope = "ALL_OUTLETS" | "OUTLET";

@Entity({ name: "promos" })
@Index("uq_promos_code", ["code"], { unique: true })
@Index("ix_promos_active_window", ["isActive", "startsAt", "endsAt"])
export class Promo {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 80 })
  code!: string;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({ name: "discount_target", type: "varchar", length: 20 })
  discountTarget!: PromoDiscountTarget;

  @Column({ name: "discount_percent", type: "integer" })
  discountPercent!: number;

  @Column({ type: "varchar", length: 20 })
  scope!: PromoScope;

  @Column({ name: "outlet_id", type: "uuid", nullable: true })
  outletId!: string | null;

  @Column({ name: "starts_at", type: "timestamptz" })
  startsAt!: Date;

  @Column({ name: "ends_at", type: "timestamptz" })
  endsAt!: Date;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "deep_link", type: "varchar", length: 512, nullable: true })
  deepLink!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
