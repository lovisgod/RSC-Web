import type { MigrationInterface, QueryRunner } from "typeorm";

export class PreventDuplicatePendingRefundRequests1784851200000 implements MigrationInterface {
  name = "PreventDuplicatePendingRefundRequests1784851200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH ranked_pending_refunds AS (
        SELECT
          "id",
          row_number() OVER (
            PARTITION BY "payment_id", "requested_by"
            ORDER BY "created_at" DESC, "id" DESC
          ) AS rank
        FROM "payment_refunds"
        WHERE "status" = 'PENDING'
      )
      UPDATE "payment_refunds" refund
      SET
        "status" = 'FAILED',
        "provider_response" = jsonb_build_object(
          'deduplicatedAt', now(),
          'deduplicationReason', 'Duplicate pending refund request superseded by a newer request',
          'previousProviderResponse', refund."provider_response"
        )
      FROM ranked_pending_refunds ranked
      WHERE refund."id" = ranked."id"
        AND ranked.rank > 1
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_payment_refunds_pending_requester"
      ON "payment_refunds" ("payment_id", "requested_by")
      WHERE "status" = 'PENDING'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_payment_refunds_pending_requester"`);
  }
}
