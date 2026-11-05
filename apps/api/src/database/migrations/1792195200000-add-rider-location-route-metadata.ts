import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRiderLocationRouteMetadata1792195200000 implements MigrationInterface {
  name = "AddRiderLocationRouteMetadata1792195200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rider_locations" ADD COLUMN IF NOT EXISTS "eta_minutes" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "rider_locations" ADD COLUMN IF NOT EXISTS "distance_km" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "rider_locations" ADD COLUMN IF NOT EXISTS "eta_provider" varchar(20)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rider_locations" DROP COLUMN IF EXISTS "eta_provider"`);
    await queryRunner.query(`ALTER TABLE "rider_locations" DROP COLUMN IF EXISTS "distance_km"`);
    await queryRunner.query(`ALTER TABLE "rider_locations" DROP COLUMN IF EXISTS "eta_minutes"`);
  }
}
