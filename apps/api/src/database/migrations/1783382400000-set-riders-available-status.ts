import type { MigrationInterface, QueryRunner } from "typeorm";

export class SetRidersAvailableStatus1783382400000 implements MigrationInterface {
  name = "SetRidersAvailableStatus1783382400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users"
      SET "rider_status" = 'AVAILABLE'
      WHERE "role" = 'RIDER'
        AND "rider_status" = 'ACTIVE'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users"
      SET "rider_status" = 'ACTIVE'
      WHERE "role" = 'RIDER'
        AND "rider_status" = 'AVAILABLE'
    `);
  }
}
