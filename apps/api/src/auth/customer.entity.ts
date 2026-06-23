import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { CustomerStatus } from "./customer-status.enum";

@Entity({ name: "customers" })
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ name: "phone_encrypted", type: "text" })
  phoneEncrypted!: string;

  @Index("uq_customers_phone_hash", { unique: true })
  @Column({ name: "phone_hash", type: "char", length: 64 })
  phoneHash!: string;

  @Column({ name: "email_encrypted", type: "text" })
  emailEncrypted!: string;

  @Index("uq_customers_email_hash", { unique: true })
  @Column({ name: "email_hash", type: "char", length: 64 })
  emailHash!: string;

  @Column({
    type: "enum",
    enum: CustomerStatus,
    enumName: "customer_status",
    default: CustomerStatus.UNVERIFIED,
  })
  status!: CustomerStatus;

  @Column({ name: "phone_verified_at", type: "timestamptz", nullable: true })
  phoneVerifiedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
