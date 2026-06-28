import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

import { MasterOrderStatus, SubOrderStatus } from "./order-status.enum";

@Entity({ name: "order_status_events" })
@Index("ix_order_status_events_master", ["masterOrderId", "createdAt"])
export class OrderStatusEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "master_order_id", type: "uuid" })
  masterOrderId!: string;

  @Column({ name: "sub_order_id", type: "uuid", nullable: true })
  subOrderId!: string | null;

  @Column({
    name: "master_status",
    type: "enum",
    enum: MasterOrderStatus,
    enumName: "master_order_status",
    nullable: true,
  })
  masterStatus!: MasterOrderStatus | null;

  @Column({
    name: "sub_order_status",
    type: "enum",
    enum: SubOrderStatus,
    enumName: "sub_order_status",
    nullable: true,
  })
  subOrderStatus!: SubOrderStatus | null;

  @Column({ name: "actor_id", type: "uuid", nullable: true })
  actorId!: string | null;

  @Column({ type: "text", nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
