import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { MasterOrderStatus } from "./order-status.enum";

@Entity({ name: "master_orders" })
@Index("ix_master_orders_customer", ["customerId"])
export class MasterOrder {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "customer_id", type: "uuid" })
  customerId!: string;

  @Column({ name: "rider_id", type: "uuid", nullable: true })
  riderId!: string | null;

  @Column({
    type: "enum",
    enum: MasterOrderStatus,
    enumName: "master_order_status",
    default: MasterOrderStatus.PENDING_PAYMENT,
  })
  status!: MasterOrderStatus;

  @Column({ name: "subtotal_minor", type: "integer", default: 0 })
  subtotalMinor!: number;

  @Column({ name: "delivery_fee_minor", type: "integer", default: 0 })
  deliveryFeeMinor!: number;

  @Column({ name: "service_fee_minor", type: "integer", default: 0 })
  serviceFeeMinor!: number;

  @Column({ name: "vat_minor", type: "integer", default: 0 })
  vatMinor!: number;

  @Column({ name: "discount_minor", type: "integer", default: 0 })
  discountMinor!: number;

  @Column({ name: "total_minor", type: "integer", default: 0 })
  totalMinor!: number;

  @Column({ type: "char", length: 3, default: "NGN" })
  currency!: "NGN";

  @Column({ name: "delivery_mode", type: "varchar", length: 20, default: "DELIVERY" })
  deliveryMode!: "DELIVERY" | "TAKEOUT";

  @Column({ name: "delivery_address", type: "text", nullable: true })
  deliveryAddress!: string | null;

  @Column({ name: "delivery_latitude", type: "double precision", nullable: true })
  deliveryLatitude!: number | null;

  @Column({ name: "delivery_longitude", type: "double precision", nullable: true })
  deliveryLongitude!: number | null;

  @Column({ name: "recipient_phone", type: "varchar", length: 32, nullable: true })
  recipientPhone!: string | null;

  @Column({ name: "payment_reference", type: "varchar", length: 120, nullable: true })
  paymentReference!: string | null;

  @Column({ name: "delivery_code", type: "char", length: 6, nullable: true })
  deliveryCode!: string | null;

  @Column({ name: "preparation_time", type: "integer", nullable: true })
  preparationTime!: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}
