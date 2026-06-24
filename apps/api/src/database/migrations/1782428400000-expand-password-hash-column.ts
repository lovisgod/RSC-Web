import type { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandPasswordHashColumn1782428400000 implements MigrationInterface {
  name = "ExpandPasswordHashColumn1782428400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customers" ALTER COLUMN "password_hash" TYPE varchar(161)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customers" ALTER COLUMN "password_hash" TYPE char(128)`,
    );
  }
}
