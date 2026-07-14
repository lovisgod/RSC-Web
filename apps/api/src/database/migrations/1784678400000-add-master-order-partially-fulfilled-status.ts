import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMasterOrderPartiallyFulfilledStatus1784678400000 implements MigrationInterface {
  name = "AddMasterOrderPartiallyFulfilledStatus1784678400000";
  transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "master_order_status" ADD VALUE IF NOT EXISTS 'PARTIALLY_FULFILLED'
    `);
    await queryRunner.query(`
      UPDATE master_orders master_order
      SET status = 'PARTIALLY_FULFILLED'
      WHERE master_order.status <> 'PENDING_PAYMENT'
        AND master_order.status <> 'CANCELLED'
        AND EXISTS (
          SELECT 1
          FROM sub_orders sub_order
          WHERE sub_order.master_order_id = master_order.id
            AND sub_order.status = 'REJECTED'
        )
        AND EXISTS (
          SELECT 1
          FROM sub_orders sub_order
          WHERE sub_order.master_order_id = master_order.id
            AND sub_order.status <> 'REJECTED'
        )
    `);
  }

  async down(): Promise<void> {
    // PostgreSQL cannot safely remove an enum value without recreating the type.
  }
}
