import type { MigrationInterface, QueryRunner } from "typeorm";

export class RenameOutletSettlementSubaccount1784419200000 implements MigrationInterface {
  name = "RenameOutletSettlementSubaccount1784419200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'outlets'
            AND column_name = 'paystack_subaccount_code'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'outlets'
            AND column_name = 'settlement_subaccount_code'
        ) THEN
          ALTER TABLE "outlets"
            RENAME COLUMN "paystack_subaccount_code" TO "settlement_subaccount_code";
        ELSIF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'outlets'
            AND column_name = 'moment_subaccount_code'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'outlets'
            AND column_name = 'settlement_subaccount_code'
        ) THEN
          ALTER TABLE "outlets"
            RENAME COLUMN "moment_subaccount_code" TO "settlement_subaccount_code";
          ALTER TABLE "outlets"
            ALTER COLUMN "settlement_subaccount_code" DROP NOT NULL;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'outlets'
            AND column_name = 'settlement_subaccount_code'
        ) AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'outlets'
            AND column_name = 'paystack_subaccount_code'
        ) THEN
          ALTER TABLE "outlets"
            RENAME COLUMN "settlement_subaccount_code" TO "paystack_subaccount_code";
        END IF;
      END
      $$;
    `);
  }
}
