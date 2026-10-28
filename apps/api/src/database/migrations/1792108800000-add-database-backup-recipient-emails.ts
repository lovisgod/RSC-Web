import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddDatabaseBackupRecipientEmails1792108800000 implements MigrationInterface {
  name = "AddDatabaseBackupRecipientEmails1792108800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "database_backup_settings"
      ADD COLUMN IF NOT EXISTS "recipient_emails" text[]
    `);
    await queryRunner.query(`
      UPDATE "database_backup_settings"
      SET "recipient_emails" = ARRAY["recipient_email"]::text[]
      WHERE "recipient_email" IS NOT NULL
        AND ("recipient_emails" IS NULL OR cardinality("recipient_emails") = 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "database_backup_settings"
      DROP COLUMN IF EXISTS "recipient_emails"
    `);
  }
}
