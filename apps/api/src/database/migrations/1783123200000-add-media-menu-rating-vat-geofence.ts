import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMediaMenuRatingVatGeofence1783123200000 implements MigrationInterface {
  name = "AddMediaMenuRatingVatGeofence1783123200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "outlets"
        ADD COLUMN IF NOT EXISTS "vat_bps" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "menu_items"
        ADD COLUMN IF NOT EXISTS "delivery_time_range" varchar(60),
        ADD COLUMN IF NOT EXISTS "rating_average" numeric(3,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "rating_count" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "menu_item_ratings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "menu_item_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "rating" integer NOT NULL,
        "comment" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_menu_item_ratings" PRIMARY KEY ("id"),
        CONSTRAINT "fk_menu_item_ratings_item" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_menu_item_ratings_customer" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "ck_menu_item_ratings_value" CHECK ("rating" BETWEEN 1 AND 5),
        CONSTRAINT "uq_menu_item_ratings_user_item" UNIQUE ("menu_item_id", "customer_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_menu_item_ratings_item" ON "menu_item_ratings" ("menu_item_id")`,
    );

    await queryRunner.query(`
      INSERT INTO "geofence_zones" ("name", "polygon")
      VALUES
        ('Lagos Island Expanded Delivery Zone', ST_GeomFromText('POLYGON((3.3300 6.4100,3.6500 6.4100,3.6500 6.5700,3.3300 6.5700,3.3300 6.4100))', 4326))
      ON CONFLICT ("name") DO UPDATE SET
        "polygon" = EXCLUDED."polygon",
        "is_active" = true
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "geofence_zones" WHERE "name" = 'Lagos Island Expanded Delivery Zone'`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_item_ratings"`);
    await queryRunner.query(`
      ALTER TABLE "menu_items"
        DROP COLUMN IF EXISTS "rating_count",
        DROP COLUMN IF EXISTS "rating_average",
        DROP COLUMN IF EXISTS "delivery_time_range"
    `);
    await queryRunner.query(`ALTER TABLE "outlets" DROP COLUMN IF EXISTS "vat_bps"`);
  }
}
