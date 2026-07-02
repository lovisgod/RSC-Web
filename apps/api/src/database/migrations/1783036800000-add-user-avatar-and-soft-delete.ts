import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserAvatarAndSoftDelete1783036800000 implements MigrationInterface {
  name = "AddUserAvatarAndSoftDelete1783036800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" varchar(512)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar_url"`);
  }
}
