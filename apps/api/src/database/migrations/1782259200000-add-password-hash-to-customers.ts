import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordHashToCustomers1782259200000 implements MigrationInterface {
  name = "AddPasswordHashToCustomers1782259200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customers" ADD "password_hash" varchar(161) NOT NULL DEFAULT ''`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "password_hash"`);
  }
}
