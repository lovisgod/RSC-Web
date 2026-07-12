import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOutletSettlementApprovals1784332800000 implements MigrationInterface {
  name = "AddOutletSettlementApprovals1784332800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "outlet_settlement_approvals" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "outlet_id" uuid NOT NULL,
        "sub_order_id" uuid NOT NULL,
        "approved_by" uuid NOT NULL,
        "provider" character varying(40) NOT NULL,
        "provider_reference" character varying(160),
        "approved_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "pk_outlet_settlement_approvals" PRIMARY KEY ("id"),
        CONSTRAINT "uq_outlet_settlement_approvals_sub_order" UNIQUE ("sub_order_id"),
        CONSTRAINT "fk_outlet_settlement_approvals_outlet" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_outlet_settlement_approvals_sub_order" FOREIGN KEY ("sub_order_id") REFERENCES "sub_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_outlet_settlement_approvals_approved_by" FOREIGN KEY ("approved_by") REFERENCES "customers"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "ix_outlet_settlement_approvals_outlet"
      ON "outlet_settlement_approvals" ("outlet_id", "approved_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "ix_outlet_settlement_approvals_outlet"`);
    await queryRunner.query(`DROP TABLE "outlet_settlement_approvals"`);
  }
}
