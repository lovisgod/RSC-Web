import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderRiderRejections1789486000000 implements MigrationInterface {
  name = "AddOrderRiderRejections1789486000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    // Persists every rider→order rejection so auto-assignment never re-assigns
    // the same rider to an order they explicitly rejected.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_rider_rejections (
        id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id    uuid        NOT NULL REFERENCES master_orders(id) ON DELETE CASCADE,
        rider_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason      text,
        rejected_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_order_rider_rejections UNIQUE (order_id, rider_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_order_rider_rejections_order_id ON order_rider_rejections(order_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_order_rider_rejections_rider_id ON order_rider_rejections(rider_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS order_rider_rejections;`);
  }
}
