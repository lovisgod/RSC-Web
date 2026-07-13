import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentRefunds1784505600000 implements MigrationInterface {
  name = "AddPaymentRefunds1784505600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_refunds" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "payment_id" uuid NOT NULL,
        "reference" varchar(120) NOT NULL,
        "amount_minor" integer NOT NULL,
        "currency" char(3) NOT NULL DEFAULT 'NGN',
        "status" varchar(20) NOT NULL,
        "reason" text,
        "provider" varchar(40) NOT NULL,
        "provider_refund_id" varchar(160),
        "requested_by" uuid NOT NULL,
        "provider_response" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_payment_refunds" PRIMARY KEY ("id"),
        CONSTRAINT "fk_payment_refunds_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_payment_refunds_requested_by" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_payment_refunds_amount_positive" CHECK ("amount_minor" > 0),
        CONSTRAINT "ck_payment_refunds_status" CHECK ("status" IN ('PENDING', 'SUCCESS', 'FAILED'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_payment_refunds_payment"
      ON "payment_refunds" ("payment_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "ix_payment_refunds_payment"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_refunds"`);
  }
}
