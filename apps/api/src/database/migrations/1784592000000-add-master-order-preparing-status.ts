import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMasterOrderPreparingStatus1784592000000 implements MigrationInterface {
  name = "AddMasterOrderPreparingStatus1784592000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "master_order_status" ADD VALUE IF NOT EXISTS 'PREPARING'
    `);
  }

  async down(): Promise<void> {
    // PostgreSQL cannot safely remove an enum value without recreating the type.
  }
}
