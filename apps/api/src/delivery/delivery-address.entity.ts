import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "delivery_addresses" })
@Index("ix_delivery_addresses_customer", ["customerId"])
export class DeliveryAddress {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "customer_id", type: "uuid" })
  customerId!: string;

  @Column({ type: "varchar", length: 80 })
  label!: string;

  @Column({ name: "address_line", type: "text" })
  addressLine!: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  city!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  state!: string | null;

  @Column({ name: "latitude", type: "double precision" })
  latitude!: number;

  @Column({ name: "longitude", type: "double precision" })
  longitude!: number;

  @Column({ name: "is_default", type: "boolean", default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}
