import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity({ name: "outlet_settlement_approvals" })
@Unique("uq_outlet_settlement_approvals_sub_order", ["subOrderId"])
@Index("ix_outlet_settlement_approvals_outlet", ["outletId", "approvedAt"])
export class OutletSettlementApproval {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "outlet_id", type: "uuid" })
  outletId!: string;

  @Column({ name: "sub_order_id", type: "uuid" })
  subOrderId!: string;

  @Column({ name: "approved_by", type: "uuid" })
  approvedBy!: string;

  @Column({ type: "varchar", length: 40 })
  provider!: string;

  @Column({ name: "provider_reference", type: "varchar", length: 160, nullable: true })
  providerReference!: string | null;

  @CreateDateColumn({ name: "approved_at", type: "timestamptz" })
  approvedAt!: Date;
}
