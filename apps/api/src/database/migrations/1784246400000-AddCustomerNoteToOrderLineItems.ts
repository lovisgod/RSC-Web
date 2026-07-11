import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomerNoteToOrderLineItems1784246400000 implements MigrationInterface {
  name = "AddCustomerNoteToOrderLineItems1784246400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_line_items" ADD "customer_note" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_line_items" DROP COLUMN "customer_note"`);
  }
}
