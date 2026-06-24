import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCustomers1782172800000 implements MigrationInterface {
  name = "CreateCustomers1782172800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "customer_status" AS ENUM ('UNVERIFIED', 'ACTIVE', 'SUSPENDED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "phone_encrypted" text NOT NULL,
        "phone_hash" char(64) NOT NULL,
        "email_encrypted" text NOT NULL,
        "email_hash" char(64) NOT NULL,
        "status" "customer_status" NOT NULL DEFAULT 'UNVERIFIED',
        "phone_verified_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_users" PRIMARY KEY ("id"),
        CONSTRAINT "uq_users_phone_hash" UNIQUE ("phone_hash"),
        CONSTRAINT "uq_users_email_hash" UNIQUE ("email_hash")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "customer_status"`);
  }
}
