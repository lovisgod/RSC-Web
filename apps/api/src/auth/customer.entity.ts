import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { CustomerStatus } from "./customer-status.enum";
import { UserRole } from "./user-role.enum";

@Entity({ name: "users" })
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ name: "phone_encrypted", type: "text" })
  phoneEncrypted!: string;

  @Index("uq_users_phone_hash", { unique: true })
  @Column({ name: "phone_hash", type: "char", length: 64 })
  phoneHash!: string;

  @Column({ name: "email_encrypted", type: "text" })
  emailEncrypted!: string;

  @Index("uq_users_email_hash", { unique: true })
  @Column({ name: "email_hash", type: "char", length: 64 })
  emailHash!: string;

  @Column({
    type: "enum",
    enum: CustomerStatus,
    enumName: "customer_status",
    default: CustomerStatus.UNVERIFIED,
  })
  status!: CustomerStatus;

  @Column({
    type: "enum",
    enum: UserRole,
    enumName: "user_role",
    default: UserRole.CUSTOMER,
  })
  role!: UserRole;

  @Column({ name: "outlet_id", type: "uuid", nullable: true })
  outletId!: string | null;

  @Column({ name: "password_hash", type: "varchar", length: 161 })
  passwordHash!: string;

  @Column({ name: "phone_verified_at", type: "timestamptz", nullable: true })
  phoneVerifiedAt!: Date | null;

  @Column({ name: "email_verified_at", type: "timestamptz", nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ name: "pending_phone_encrypted", type: "text", nullable: true })
  pendingPhoneEncrypted!: string | null;

  @Column({ name: "pending_phone_hash", type: "char", length: 64, nullable: true })
  pendingPhoneHash!: string | null;

  @Column({ name: "pending_email_encrypted", type: "text", nullable: true })
  pendingEmailEncrypted!: string | null;

  @Column({ name: "pending_email_hash", type: "char", length: 64, nullable: true })
  pendingEmailHash!: string | null;

  @Column({ name: "vehicle_type", type: "varchar", length: 40, nullable: true })
  vehicleType!: string | null;

  @Column({ name: "plate_number", type: "varchar", length: 40, nullable: true })
  plateNumber!: string | null;

  @Column({ name: "rider_status", type: "varchar", length: 40, nullable: true })
  riderStatus!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
