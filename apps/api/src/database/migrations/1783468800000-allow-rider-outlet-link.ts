import type { MigrationInterface, QueryRunner } from "typeorm";

export class AllowRiderOutletLink1783468800000 implements MigrationInterface {
  name = "AllowRiderOutletLink1783468800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT IF EXISTS "ck_users_role_outlet"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "ck_users_role_outlet"
      CHECK (
        ("role" = 'ADMIN' AND "outlet_id" IS NOT NULL)
        OR ("role" = 'RIDER')
        OR ("role" NOT IN ('ADMIN', 'RIDER') AND "outlet_id" IS NULL)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT IF EXISTS "ck_users_role_outlet"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "ck_users_role_outlet"
      CHECK (
        ("role" = 'ADMIN' AND "outlet_id" IS NOT NULL)
        OR ("role" <> 'ADMIN' AND "outlet_id" IS NULL)
      )
    `);
  }
}
