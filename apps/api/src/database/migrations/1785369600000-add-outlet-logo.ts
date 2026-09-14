import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOutletLogo1785369600000 implements MigrationInterface {
  name = "AddOutletLogo1785369600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE outlets
      ADD COLUMN logo_url varchar(512)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE outlets DROP COLUMN logo_url");
  }
}
