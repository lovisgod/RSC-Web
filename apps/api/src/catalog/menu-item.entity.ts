import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
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

  @Column({ name: "delivery_time_range", type: "varchar", length: 60, nullable: true })
  deliveryTimeRange!: string | null;

  @Column({ name: "rating_average", type: "numeric", precision: 3, scale: 2, default: 0 })
  ratingAverage!: string;

  @Column({ name: "rating_count", type: "integer", default: 0 })
  ratingCount!: number;

  @Column({ name: "price_minor", type: "integer" })
  priceMinor!: number;

  @Column({ name: "discount_price_minor", type: "integer", nullable: true })
  discountPriceMinor!: number | null;

  @Column({ name: "discount_starts_at", type: "timestamptz", nullable: true })
  discountStartsAt!: Date | null;

  @Column({ name: "discount_ends_at", type: "timestamptz", nullable: true })
  discountEndsAt!: Date | null;

  currentPriceMinor!: number;

  isDiscountActive!: boolean;

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

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  hydrateCurrentPrice(): void {
    this.isDiscountActive = this.isDiscountActiveAt();
    this.currentPriceMinor = this.getCurrentPriceMinor();
  }

  isDiscountActiveAt(at = new Date()): boolean {
    const startsAt = this.discountStartsAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    const endsAt = this.discountEndsAt?.getTime() ?? Number.POSITIVE_INFINITY;
    return (
      this.discountPriceMinor !== null &&
      this.discountPriceMinor !== undefined &&
      this.discountPriceMinor > 0 &&
      this.discountPriceMinor < this.priceMinor &&
      at.getTime() >= startsAt &&
      at.getTime() <= endsAt
    );
  }

  getCurrentPriceMinor(at = new Date()): number {
    return this.isDiscountActiveAt(at) ? this.discountPriceMinor! : this.priceMinor;
  }
}
