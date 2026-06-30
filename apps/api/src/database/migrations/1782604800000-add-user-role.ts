import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRole1782604800000 implements MigrationInterface {
  name = "AddUserRole1782604800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "user_role" AS ENUM ('SUPER_ADMIN', 'CUSTOMER', 'ADMIN', 'RIDER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" "user_role" NOT NULL DEFAULT 'CUSTOMER'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "user_role"`);
  }
}
