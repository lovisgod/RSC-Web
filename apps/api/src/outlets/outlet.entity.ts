import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "outlets" })
export class Outlet {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "text", nullable: true })
  address!: string | null;

  @Column({ name: "cuisine_type", length: 100 })
  cuisineType!: string;

  @Column({ name: "image_url", type: "varchar", length: 512, nullable: true })
  imageUrl!: string | null;

  @Column({ name: "is_online", type: "boolean", default: true })
  isOnline!: boolean;

  @Column({ name: "moment_subaccount_code", length: 100 })
  momentSubaccountCode!: string;

  @Column({ name: "vat_bps", type: "integer", default: 0 })
  vatBps!: number;

  @Column({ type: "double precision", nullable: true })
  latitude!: number | null;

  @Column({ type: "double precision", nullable: true })
  longitude!: number | null;

  @Column({ name: "delivery_radius_km", type: "double precision", default: 15 })
  deliveryRadiusKm!: number;

  @Column({ name: "rating_average", type: "numeric", precision: 3, scale: 2, default: 0 })
  ratingAverage!: string;

  @Column({ name: "rating_count", type: "integer", default: 0 })
  ratingCount!: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}
