import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { SubOrderStatus } from "./order-status.enum";

@Entity({ name: "sub_orders" })
@Index("ix_sub_orders_master", ["masterOrderId"])
@Index("ix_sub_orders_outlet", ["outletId"])
export class SubOrder {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "master_order_id", type: "uuid" })
  masterOrderId!: string;

  @Column({ name: "outlet_id", type: "uuid" })
  outletId!: string;

  @Column({
    type: "enum",
    enum: SubOrderStatus,
    enumName: "sub_order_status",
    default: SubOrderStatus.PENDING,
  })
  status!: SubOrderStatus;

  @Column({ name: "pickup_code", type: "char", length: 6 })
  pickupCode!: string;

  @Column({ name: "subtotal_minor", type: "integer", default: 0 })
  subtotalMinor!: number;

  @Column({ name: "commission_minor", type: "integer", default: 0 })
  commissionMinor!: number;

  @Column({ name: "net_minor", type: "integer", default: 0 })
  netMinor!: number;

  @Column({ type: "char", length: 3, default: "NGN" })
  currency!: "NGN";

  @Column({ name: "preparation_time", type: "integer", nullable: true })
  preparationTime!: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}
