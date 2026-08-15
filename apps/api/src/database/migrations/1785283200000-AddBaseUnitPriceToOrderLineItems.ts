import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddBaseUnitPriceToOrderLineItems1785283200000 implements MigrationInterface {
  name = "AddBaseUnitPriceToOrderLineItems1785283200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_line_items" ADD "base_unit_price_minor" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_line_items" DROP COLUMN "base_unit_price_minor"`);
  }
}
