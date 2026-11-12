import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMenuCategoryHours1792281600000 implements MigrationInterface {
  name = "AddMenuCategoryHours1792281600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "menu_categories" ADD COLUMN IF NOT EXISTS "available_from" time`,
    );
    await queryRunner.query(
      `ALTER TABLE "menu_categories" ADD COLUMN IF NOT EXISTS "available_until" time`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "menu_categories" DROP COLUMN IF EXISTS "available_until"`,
    );
    await queryRunner.query(`ALTER TABLE "menu_categories" DROP COLUMN IF EXISTS "available_from"`);
  }
}
