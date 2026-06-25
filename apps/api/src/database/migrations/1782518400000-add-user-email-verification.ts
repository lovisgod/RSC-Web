import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserEmailVerification1782518400000 implements MigrationInterface {
  name = "AddUserEmailVerification1782518400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "email_verified_at" timestamptz`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified_at"`);
  }
}
