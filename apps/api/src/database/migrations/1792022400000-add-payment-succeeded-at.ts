import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentSucceededAt1792022400000 implements MigrationInterface {
  name = "AddPaymentSucceededAt1792022400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" ADD "succeeded_at" timestamptz`);
    await queryRunner.query(`
      UPDATE "payments" payment
      SET "succeeded_at" = COALESCE(
        (
          SELECT MIN(
            CASE
              WHEN event."payload" #>> '{data,updated_at}' ~
                '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}'
              THEN (event."payload" #>> '{data,updated_at}')::timestamptz
              ELSE event."processed_at"
            END
          )
          FROM "payment_webhook_events" event
          WHERE event."gateway" = payment."gateway"
            AND event."payload" #>> '{data,external_reference}' = payment."reference"
            AND event."event_type" IN (
              'payment.succeeded',
              'payment_session.updated',
              'payment_session.completed',
              'charge.success'
            )
        ),
        payment."created_at"
      )
      WHERE payment."status" = 'SUCCESS'
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_payments_success_settlement_date" ON "payments" ("succeeded_at", "master_order_id") WHERE "status" = 'SUCCESS'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_payments_success_settlement_date"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "succeeded_at"`);
  }
}
