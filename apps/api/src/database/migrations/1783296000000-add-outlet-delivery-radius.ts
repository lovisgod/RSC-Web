import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOutletDeliveryRadius1783296000000 implements MigrationInterface {
  name = "AddOutletDeliveryRadius1783296000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "outlets"
        ADD COLUMN IF NOT EXISTS "latitude" double precision,
        ADD COLUMN IF NOT EXISTS "longitude" double precision,
        ADD COLUMN IF NOT EXISTS "delivery_radius_km" double precision NOT NULL DEFAULT 15
    `);

    await queryRunner.query(`
      UPDATE "outlets"
      SET
        "latitude" = COALESCE("latitude", 6.4474),
        "longitude" = COALESCE("longitude", 3.4542),
        "delivery_radius_km" = COALESCE("delivery_radius_km", 15)
    `);

    await queryRunner.query(`
      ALTER TABLE "outlets"
        ALTER COLUMN "latitude" SET NOT NULL,
        ALTER COLUMN "longitude" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "outlets"
        ADD CONSTRAINT "ck_outlets_delivery_location"
        CHECK (
          "latitude" BETWEEN -90 AND 90
          AND "longitude" BETWEEN -180 AND 180
          AND "delivery_radius_km" > 0
        )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "outlets" DROP CONSTRAINT IF EXISTS "ck_outlets_delivery_location"`,
    );
    await queryRunner.query(`
      ALTER TABLE "outlets"
        DROP COLUMN IF EXISTS "delivery_radius_km",
        DROP COLUMN IF EXISTS "longitude",
        DROP COLUMN IF EXISTS "latitude"
    `);
  }
}
