import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlatformCharges1783728000000 implements MigrationInterface {
  name = "AddPlatformCharges1783728000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_charges" (
        "id" integer NOT NULL DEFAULT 1,
        "platform_commission_bps" integer NOT NULL,
        "default_vat_bps" integer NOT NULL,
        "delivery_fee_minor" integer NOT NULL,
        "service_fee_minor" integer NOT NULL DEFAULT 0,
        "currency" char(3) NOT NULL DEFAULT 'NGN',
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_platform_charges" PRIMARY KEY ("id"),
        CONSTRAINT "ck_platform_charges_singleton" CHECK ("id" = 1),
        CONSTRAINT "ck_platform_charges_nonnegative" CHECK (
          "platform_commission_bps" >= 0
          AND "default_vat_bps" >= 0
          AND "delivery_fee_minor" >= 0
          AND "service_fee_minor" >= 0
        )
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_charges"`);
  }
}
