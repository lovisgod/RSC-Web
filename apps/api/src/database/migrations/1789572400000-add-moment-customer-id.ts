import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMomentCustomerId1789572400000 implements MigrationInterface {
  name = "AddMomentCustomerId1789572400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "moment_customer_id" VARCHAR(64) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "moment_customer_id"
    `);
  }
}
