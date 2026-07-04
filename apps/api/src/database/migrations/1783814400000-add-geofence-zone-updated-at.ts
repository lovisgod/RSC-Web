import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddGeofenceZoneUpdatedAt1783814400000 implements MigrationInterface {
  name = "AddGeofenceZoneUpdatedAt1783814400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "geofence_zones"
        ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "geofence_zones"
        DROP COLUMN IF EXISTS "updated_at"
    `);
  }
}
