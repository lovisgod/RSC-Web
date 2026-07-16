import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type PaymentRefundStatus = "PENDING" | "SUCCESS" | "FAILED";

@Entity({ name: "payment_refunds" })
@Index("ix_payment_refunds_payment", ["paymentId", "createdAt"])
@Index("uq_payment_refunds_pending_requester", ["paymentId", "requestedBy"], {
  unique: true,
  where: `"status" = 'PENDING'`,
})
export class PaymentRefund {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "payment_id", type: "uuid" })
  paymentId!: string;

  @Column({ type: "varchar", length: 120 })
  reference!: string;

  @Column({ name: "amount_minor", type: "integer" })
  amountMinor!: number;

  @Column({ type: "char", length: 3, default: "NGN" })
  currency!: "NGN";

  @Column({ type: "varchar", length: 20 })
  status!: PaymentRefundStatus;

  @Column({ type: "text", nullable: true })
  reason!: string | null;

  @Column({ type: "varchar", length: 40 })
  provider!: string;

  @Column({ name: "provider_refund_id", type: "varchar", length: 160, nullable: true })
  providerRefundId!: string | null;

  @Column({ name: "requested_by", type: "uuid" })
  requestedBy!: string;

  @Column({ name: "provider_response", type: "jsonb", nullable: true })
  providerResponse!: unknown;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
