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

  @Column({ name: "discount_minor", type: "integer", default: 0 })
  discountMinor!: number;

  @Column({ name: "total_minor", type: "integer", default: 0 })
  totalMinor!: number;

  @Column({ type: "char", length: 3, default: "NGN" })
  currency!: "NGN";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}
