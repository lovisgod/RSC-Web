import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type DatabaseBackupStatus = "NEVER_RUN" | "RUNNING" | "SUCCESS" | "FAILED";

const bigintTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | null): number | null => (value === null ? null : Number(value)),
};

@Entity({ name: "database_backup_settings" })
export class DatabaseBackupSettings {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "is_enabled", type: "boolean", default: false })
  isEnabled!: boolean;

  @Column({ name: "interval_minutes", type: "integer", default: 1440 })
  intervalMinutes!: number;

  @Column({ name: "recipient_email", type: "varchar", length: 254, nullable: true })
  recipientEmail!: string | null;

  @Column({ name: "last_run_at", type: "timestamptz", nullable: true })
  lastRunAt!: Date | null;

  @Column({ name: "next_run_at", type: "timestamptz", nullable: true })
  nextRunAt!: Date | null;

  @Column({ name: "last_status", type: "varchar", length: 40, default: "NEVER_RUN" })
  lastStatus!: DatabaseBackupStatus;

  @Column({ name: "last_error", type: "text", nullable: true })
  lastError!: string | null;

  @Column({ name: "last_file_name", type: "varchar", length: 160, nullable: true })
  lastFileName!: string | null;

  @Column({
    name: "last_file_size_bytes",
    type: "bigint",
    nullable: true,
    transformer: bigintTransformer,
  })
  lastFileSizeBytes!: number | null;

  @Column({ name: "updated_by_id", type: "uuid", nullable: true })
  updatedById!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
