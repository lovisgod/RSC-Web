import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPromos1784764800000 implements MigrationInterface {
  name = "AddPromos1784764800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promos" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar(80) NOT NULL,
        "title" varchar(160) NOT NULL,
        "body" text NOT NULL,
        "discount_target" varchar(20) NOT NULL,
        "discount_percent" integer NOT NULL,
        "scope" varchar(20) NOT NULL,
        "outlet_id" uuid NULL,
        "starts_at" timestamptz NOT NULL,
        "ends_at" timestamptz NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "deep_link" varchar(512) NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_promos_code" UNIQUE ("code"),
        CONSTRAINT "fk_promos_outlet" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE SET NULL,
        CONSTRAINT "ck_promos_discount_target" CHECK ("discount_target" IN ('DELIVERY', 'ORDER')),
        CONSTRAINT "ck_promos_scope" CHECK ("scope" IN ('ALL_OUTLETS', 'OUTLET')),
        CONSTRAINT "ck_promos_discount_percent" CHECK ("discount_percent" BETWEEN 1 AND 100),
        CONSTRAINT "ck_promos_scope_outlet" CHECK (("scope" = 'ALL_OUTLETS' AND "outlet_id" IS NULL) OR ("scope" = 'OUTLET' AND "outlet_id" IS NOT NULL)),
        CONSTRAINT "ck_promos_timeframe" CHECK ("ends_at" > "starts_at")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_promos_active_window"
      ON "promos" ("is_active", "starts_at", "ends_at")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "promos"`);
  }
}
