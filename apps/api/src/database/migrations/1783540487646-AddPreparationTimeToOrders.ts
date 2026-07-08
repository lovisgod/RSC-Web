import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPreparationTimeToOrders1783540487646 implements MigrationInterface {
  name = "AddPreparationTimeToOrders1783540487646";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sub_orders" ADD "preparation_time" integer`);
    await queryRunner.query(`ALTER TABLE "master_orders" ADD "preparation_time" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "master_orders" DROP COLUMN "preparation_time"`);
    await queryRunner.query(`ALTER TABLE "sub_orders" DROP COLUMN "preparation_time"`);
  }
}
