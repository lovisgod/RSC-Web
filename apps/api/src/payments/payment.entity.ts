import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export enum PaymentStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

@Entity({ name: "payments" })
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "master_order_id", type: "uuid" })
  masterOrderId!: string;

  @Column({ name: "amount_minor", type: "integer" })
  amountMinor!: number;

  @Column({ type: "char", length: 3, default: "NGN" })
  currency!: "NGN";

  @Column({ type: "varchar", length: 40 })
  gateway!: string;

  @Index("uq_payments_reference", { unique: true })
  @Column({ type: "varchar", length: 120 })
  reference!: string;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    enumName: "payment_status",
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({ name: "checkout_url", type: "text", nullable: true })
  checkoutUrl!: string | null;

  @Column({ name: "split_breakdown", type: "jsonb", default: () => "'[]'::jsonb" })
  splitBreakdown!: unknown[];

  @Column({ name: "provider_response", type: "jsonb", nullable: true })
  providerResponse!: unknown;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
