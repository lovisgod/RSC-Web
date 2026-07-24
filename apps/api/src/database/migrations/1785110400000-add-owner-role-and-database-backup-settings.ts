import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOwnerRoleAndDatabaseBackupSettings1785110400000 implements MigrationInterface {
  name = "AddOwnerRoleAndDatabaseBackupSettings1785110400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'OWNER'`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "database_backup_settings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "is_enabled" boolean NOT NULL DEFAULT false,
        "interval_minutes" integer NOT NULL DEFAULT 1440,
        "recipient_email" varchar(254),
        "last_run_at" timestamptz,
        "next_run_at" timestamptz,
        "last_status" varchar(40) NOT NULL DEFAULT 'NEVER_RUN',
        "last_error" text,
        "last_file_name" varchar(160),
        "last_file_size_bytes" bigint,
        "updated_by_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_database_backup_settings" PRIMARY KEY ("id"),
        CONSTRAINT "fk_database_backup_settings_updated_by" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "ck_database_backup_settings_interval" CHECK ("interval_minutes" BETWEEN 15 AND 10080)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "database_backup_settings"`);
  }
}
