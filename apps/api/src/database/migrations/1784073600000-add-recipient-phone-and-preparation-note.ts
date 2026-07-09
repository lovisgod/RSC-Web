import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecipientPhoneAndPreparationNote1784073600000 implements MigrationInterface {
  name = "AddRecipientPhoneAndPreparationNote1784073600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "master_orders"
        ADD COLUMN IF NOT EXISTS "recipient_phone" varchar(32)
    `);
    await queryRunner.query(`
      ALTER TABLE "sub_orders"
        ADD COLUMN IF NOT EXISTS "preparation_note" text
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sub_orders"
        DROP COLUMN IF EXISTS "preparation_note"
    `);
    await queryRunner.query(`
      ALTER TABLE "master_orders"
        DROP COLUMN IF EXISTS "recipient_phone"
    `);
  }
}
