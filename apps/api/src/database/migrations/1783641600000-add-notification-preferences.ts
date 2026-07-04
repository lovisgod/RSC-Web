import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationPreferences1783641600000 implements MigrationInterface {
  name = "AddNotificationPreferences1783641600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "notification_preferences" jsonb NOT NULL DEFAULT '{
          "promotions": true,
          "discounts": true,
          "seasonalOffers": true,
          "orderStatus": true
        }'::jsonb
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "notification_preferences"
    `);
  }
}
