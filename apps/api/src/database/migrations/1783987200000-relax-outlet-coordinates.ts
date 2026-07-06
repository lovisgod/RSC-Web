import type { MigrationInterface, QueryRunner } from "typeorm";

export class RelaxOutletCoordinates1783987200000 implements MigrationInterface {
  name = "RelaxOutletCoordinates1783987200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "outlets"
        ALTER COLUMN "latitude" DROP NOT NULL,
        ALTER COLUMN "longitude" DROP NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "outlets"
      SET
        "latitude" = COALESCE("latitude", 6.4474),
        "longitude" = COALESCE("longitude", 3.4542)
    `);
    await queryRunner.query(`
      ALTER TABLE "outlets"
        ALTER COLUMN "latitude" SET NOT NULL,
        ALTER COLUMN "longitude" SET NOT NULL
    `);
  }
}
