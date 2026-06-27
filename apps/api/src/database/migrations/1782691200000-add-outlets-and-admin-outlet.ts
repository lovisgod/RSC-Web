import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOutletsAndAdminOutlet1782691200000 implements MigrationInterface {
  name = "AddOutletsAndAdminOutlet1782691200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outlets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "cuisine_type" varchar(100) NOT NULL,
        "image_url" varchar(512),
        "is_online" boolean NOT NULL DEFAULT true,
        "moment_subaccount_code" varchar(100) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_outlets" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "outlet_id" uuid`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_outlet') THEN
          ALTER TABLE "users"
          ADD CONSTRAINT "fk_users_outlet"
          FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_users_role_outlet') THEN
          ALTER TABLE "users"
          ADD CONSTRAINT "ck_users_role_outlet"
          CHECK (
            ("role" = 'ADMIN' AND "outlet_id" IS NOT NULL)
            OR ("role" <> 'ADMIN' AND "outlet_id" IS NULL)
          );
        END IF;
      END
      $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "ck_users_role_outlet"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_outlet"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "outlet_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "outlets"`);
  }
}
