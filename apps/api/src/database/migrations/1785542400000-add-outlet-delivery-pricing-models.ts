import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOutletDeliveryPricingModels1785542400000 implements MigrationInterface {
  name = "AddOutletDeliveryPricingModels1785542400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE outlets
      ADD COLUMN IF NOT EXISTS delivery_pricing_model varchar(32) NOT NULL DEFAULT 'FLAT',
      ADD COLUMN IF NOT EXISTS delivery_fee_minor integer NOT NULL DEFAULT 150000,
      ADD COLUMN IF NOT EXISTS delivery_base_fee_minor integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS delivery_price_per_km_minor integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS delivery_location_fees jsonb NOT NULL DEFAULT '[]'::jsonb;
    `);

    await queryRunner.query(`
      ALTER TABLE outlets
      ADD CONSTRAINT ck_outlets_delivery_fees_nonnegative CHECK (
        delivery_fee_minor >= 0
        AND delivery_base_fee_minor >= 0
        AND delivery_price_per_km_minor >= 0
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE outlets DROP CONSTRAINT IF EXISTS ck_outlets_delivery_fees_nonnegative;
      ALTER TABLE outlets DROP COLUMN IF EXISTS delivery_location_fees;
      ALTER TABLE outlets DROP COLUMN IF EXISTS delivery_price_per_km_minor;
      ALTER TABLE outlets DROP COLUMN IF EXISTS delivery_base_fee_minor;
      ALTER TABLE outlets DROP COLUMN IF EXISTS delivery_fee_minor;
      ALTER TABLE outlets DROP COLUMN IF EXISTS delivery_pricing_model;
    `);
  }
}
