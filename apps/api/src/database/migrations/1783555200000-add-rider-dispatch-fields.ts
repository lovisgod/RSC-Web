import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRiderDispatchFields1783555200000 implements MigrationInterface {
  name = "AddRiderDispatchFields1783555200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "outlets"
        ADD COLUMN IF NOT EXISTS "address" text
    `);

    await queryRunner.query(`
      ALTER TABLE "sub_orders"
        ADD COLUMN IF NOT EXISTS "pickup_code" char(6)
    `);

    await queryRunner.query(`
      UPDATE "sub_orders"
      SET "pickup_code" = LPAD(FLOOR(RANDOM() * 1000000)::int::text, 6, '0')
      WHERE "pickup_code" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sub_orders"
        ALTER COLUMN "pickup_code" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sub_orders"
        ADD CONSTRAINT "ck_sub_orders_pickup_code"
        CHECK ("pickup_code" ~ '^[0-9]{6}$')
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD COLUMN IF NOT EXISTS "data" jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
        DROP COLUMN IF EXISTS "data"
    `);
    await queryRunner.query(`
      ALTER TABLE "sub_orders"
        DROP CONSTRAINT IF EXISTS "ck_sub_orders_pickup_code"
    `);
    await queryRunner.query(`
      ALTER TABLE "sub_orders"
        DROP COLUMN IF EXISTS "pickup_code"
    `);
    await queryRunner.query(`
      ALTER TABLE "outlets"
        DROP COLUMN IF EXISTS "address"
    `);
  }
}
