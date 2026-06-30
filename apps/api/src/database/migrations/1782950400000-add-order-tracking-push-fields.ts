import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderTrackingPushFields1782950400000 implements MigrationInterface {
  name = "AddOrderTrackingPushFields1782950400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "fcm_token" varchar(255)
    `);

    await queryRunner.query(`
      ALTER TABLE "master_orders"
        ADD COLUMN IF NOT EXISTS "rider_id" uuid,
        ADD COLUMN IF NOT EXISTS "delivery_code" char(6)
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'fk_master_orders_rider'
        ) THEN
          ALTER TABLE "master_orders"
            ADD CONSTRAINT "fk_master_orders_rider" FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_master_orders_rider" ON "master_orders" ("rider_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_status_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "master_order_id" uuid NOT NULL,
        "sub_order_id" uuid,
        "master_status" "master_order_status",
        "sub_order_status" "sub_order_status",
        "actor_id" uuid,
        "note" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_order_status_events" PRIMARY KEY ("id"),
        CONSTRAINT "fk_order_status_events_master" FOREIGN KEY ("master_order_id") REFERENCES "master_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_order_status_events_sub_order" FOREIGN KEY ("sub_order_id") REFERENCES "sub_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_order_status_events_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_order_status_events_master" ON "order_status_events" ("master_order_id", "created_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "order_status_events"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "ix_master_orders_rider"`);
    await queryRunner.query(`
      ALTER TABLE "master_orders"
        DROP CONSTRAINT IF EXISTS "fk_master_orders_rider",
        DROP COLUMN IF EXISTS "delivery_code",
        DROP COLUMN IF EXISTS "rider_id"
    `);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "fcm_token"`);
  }
}
