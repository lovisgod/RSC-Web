import type { MigrationInterface, QueryRunner } from "typeorm";

export class EnablePlatformExtensions1782086400000 implements MigrationInterface {
  name = "EnablePlatformExtensions1782086400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "postgis"');
  }

  async down(): Promise<void> {
    // Extensions are intentionally retained because other schemas may use them.
  }
}
