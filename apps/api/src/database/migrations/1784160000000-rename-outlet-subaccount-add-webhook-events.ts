import type { MigrationInterface, QueryRunner } from "typeorm";

export class RenameOutletSubaccountAddWebhookEvents1784160000000 implements MigrationInterface {
  name = "RenameOutletSubaccountAddWebhookEvents1784160000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    // Rename the column and make it nullable so outlets can exist before Paystack onboarding
    await queryRunner.query(`
      ALTER TABLE "outlets"
        RENAME COLUMN "moment_subaccount_code" TO "paystack_subaccount_code"
    `);
    await queryRunner.query(`
      ALTER TABLE "outlets"
        ALTER COLUMN "paystack_subaccount_code" DROP NOT NULL
    `);

    // Idempotency log — prevents duplicate processing of the same webhook event
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "gateway" varchar(40) NOT NULL,
        "event_id" varchar(255) NOT NULL,
        "event_type" varchar(120) NOT NULL,
        "payload" jsonb NOT NULL,
        "processed_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_payment_webhook_events" PRIMARY KEY ("id"),
        CONSTRAINT "uq_payment_webhook_events_gateway_event" UNIQUE ("gateway", "event_id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_webhook_events"`);
    await queryRunner.query(`
      ALTER TABLE "outlets"
        ALTER COLUMN "paystack_subaccount_code" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "outlets"
        RENAME COLUMN "paystack_subaccount_code" TO "moment_subaccount_code"
    `);
  }
}
