import type { MigrationInterface, QueryRunner } from "typeorm";

export class RenameOutletSettlementSubaccount1784419200000 implements MigrationInterface {
  name = "RenameOutletSettlementSubaccount1784419200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "outlets"
        RENAME COLUMN "paystack_subaccount_code" TO "settlement_subaccount_code"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "outlets"
        RENAME COLUMN "settlement_subaccount_code" TO "paystack_subaccount_code"
    `);
  }
}
