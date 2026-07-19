import type { MigrationInterface, QueryRunner } from "typeorm";

export class EnforceUniqueOutletSettlementSubaccounts1785024000000 implements MigrationInterface {
  name = "EnforceUniqueOutletSettlementSubaccounts1785024000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_outlets_settlement_subaccount_code"
      ON "outlets" ("settlement_subaccount_code")
      WHERE "settlement_subaccount_code" IS NOT NULL
        AND "settlement_subaccount_code" <> ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_outlets_settlement_subaccount_code"`);
  }
}
