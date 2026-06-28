import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

import { UserRole } from "../auth/user-role.enum";

@Entity({ name: "notifications" })
@Index("ix_notifications_recipient", ["recipientId", "recipientRole"])
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "recipient_id", type: "uuid" })
  recipientId!: string;

  @Column({
    name: "recipient_role",
    type: "enum",
    enum: UserRole,
    enumName: "user_role",
  })
  recipientRole!: UserRole;

  @Column({ type: "varchar", length: 80 })
  type!: string;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({ name: "is_read", type: "boolean", default: false })
  isRead!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
