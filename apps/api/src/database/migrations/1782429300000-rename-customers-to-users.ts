import type { MigrationInterface, QueryRunner } from "typeorm";

export class RenameCustomersToUsers1782429300000 implements MigrationInterface {
  name = "RenameCustomersToUsers1782429300000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'customers'
        ) THEN
          ALTER TABLE "customers" RENAME TO "users";
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pk_customers') THEN
          ALTER TABLE "users" RENAME CONSTRAINT "pk_customers" TO "pk_users";
        END IF;

        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_customers_phone_hash') THEN
          ALTER TABLE "users" RENAME CONSTRAINT "uq_customers_phone_hash" TO "uq_users_phone_hash";
        END IF;

        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_customers_email_hash') THEN
          ALTER TABLE "users" RENAME CONSTRAINT "uq_customers_email_hash" TO "uq_users_email_hash";
        END IF;
      END
      $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pk_users') THEN
          ALTER TABLE "users" RENAME CONSTRAINT "pk_users" TO "pk_customers";
        END IF;

        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_phone_hash') THEN
          ALTER TABLE "users" RENAME CONSTRAINT "uq_users_phone_hash" TO "uq_customers_phone_hash";
        END IF;

        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_email_hash') THEN
          ALTER TABLE "users" RENAME CONSTRAINT "uq_users_email_hash" TO "uq_customers_email_hash";
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'users'
        ) THEN
          ALTER TABLE "users" RENAME TO "customers";
        END IF;
      END
      $$;
    `);
  }
}
