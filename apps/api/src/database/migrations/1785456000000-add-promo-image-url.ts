import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPromoImageUrl1785456000000 implements MigrationInterface {
  name = "AddPromoImageUrl1785456000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE promos
      ADD COLUMN image_url varchar(512)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE promos DROP COLUMN image_url");
  }
}
