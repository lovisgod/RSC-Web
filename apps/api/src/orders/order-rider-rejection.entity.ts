import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("order_rider_rejections")
export class OrderRiderRejection {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "order_id" })
  orderId!: string;

  @Column({ type: "uuid", name: "rider_id" })
  riderId!: string;

  @Column({ type: "text", nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: "rejected_at" })
  rejectedAt!: Date;
}
