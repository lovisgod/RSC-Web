import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

import { UserRole } from "../auth/user-role.enum";

@Entity({ name: "audit_logs" })
@Index("ix_audit_logs_created_at", ["createdAt"])
@Index("ix_audit_logs_actor", ["actorId", "createdAt"])
@Index("ix_audit_logs_resource", ["resourceType", "resourceId", "createdAt"])
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "actor_id", type: "uuid", nullable: true })
  actorId!: string | null;

  @Column({ name: "actor_role", type: "varchar", length: 40, nullable: true })
  actorRole!: UserRole | null;

  @Column({ type: "varchar", length: 160 })
  action!: string;

  @Column({ type: "varchar", length: 12 })
  method!: string;

  @Column({ type: "varchar", length: 512 })
  path!: string;

  @Column({ name: "status_code", type: "integer" })
  statusCode!: number;

  @Column({ name: "resource_type", type: "varchar", length: 80, nullable: true })
  resourceType!: string | null;

  @Column({ name: "resource_id", type: "varchar", length: 160, nullable: true })
  resourceId!: string | null;

  @Column({ name: "request_id", type: "varchar", length: 80, nullable: true })
  requestId!: string | null;

  @Column({ name: "ip_address", type: "varchar", length: 80, nullable: true })
  ipAddress!: string | null;

  @Column({ name: "user_agent", type: "varchar", length: 512, nullable: true })
  userAgent!: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
