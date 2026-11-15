import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRiderTrackingIncidents1792368000000 implements MigrationInterface {
  name = "AddRiderTrackingIncidents1792368000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rider_tracking_incidents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "master_order_id" uuid NOT NULL,
        "rider_id" uuid NOT NULL,
        "status" character varying(20) NOT NULL,
        "last_seen_at" TIMESTAMP WITH TIME ZONE,
        "stale_at" TIMESTAMP WITH TIME ZONE,
        "offline_at" TIMESTAMP WITH TIME ZONE,
        "resolved_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rider_tracking_incidents" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_rider_tracking_incidents_order" UNIQUE ("master_order_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_rider_tracking_incidents_rider_status"
      ON "rider_tracking_incidents" ("rider_id", "status")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rider_tracking_incidents"`);
  }
}
