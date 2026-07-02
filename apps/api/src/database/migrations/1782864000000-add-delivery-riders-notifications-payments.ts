import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeliveryRidersNotificationsPayments1782864000000 implements MigrationInterface {
  name = "AddDeliveryRidersNotificationsPayments1782864000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
          CREATE TYPE "payment_status" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "pending_phone_encrypted" text,
        ADD COLUMN IF NOT EXISTS "pending_phone_hash" char(64),
        ADD COLUMN IF NOT EXISTS "pending_email_encrypted" text,
        ADD COLUMN IF NOT EXISTS "pending_email_hash" char(64),
        ADD COLUMN IF NOT EXISTS "vehicle_type" varchar(40),
        ADD COLUMN IF NOT EXISTS "plate_number" varchar(40),
        ADD COLUMN IF NOT EXISTS "rider_status" varchar(40)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "delivery_addresses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL,
        "label" varchar(80) NOT NULL,
        "address_line" text NOT NULL,
        "city" varchar(120),
        "state" varchar(120),
        "latitude" double precision NOT NULL,
        "longitude" double precision NOT NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_delivery_addresses" PRIMARY KEY ("id"),
        CONSTRAINT "fk_delivery_addresses_customer" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_delivery_addresses_customer" ON "delivery_addresses" ("customer_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_delivery_addresses_default"
      ON "delivery_addresses" ("customer_id")
      WHERE "is_default" = true AND "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "geofence_zones" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "polygon" geometry(Polygon, 4326) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_geofence_zones" PRIMARY KEY ("id"),
        CONSTRAINT "uq_geofence_zones_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_geofence_zones_polygon" ON "geofence_zones" USING GIST ("polygon")`,
    );

    await queryRunner.query(`
      INSERT INTO "geofence_zones" ("name", "polygon")
      VALUES
        ('Ikoyi', ST_GeomFromText('POLYGON((3.4100 6.4300,3.4750 6.4300,3.4750 6.4750,3.4100 6.4750,3.4100 6.4300))', 4326)),
        ('Victoria Island', ST_GeomFromText('POLYGON((3.3950 6.4100,3.4750 6.4100,3.4750 6.4450,3.3950 6.4450,3.3950 6.4100))', 4326)),
        ('Banana Island', ST_GeomFromText('POLYGON((3.4400 6.4450,3.4700 6.4450,3.4700 6.4650,3.4400 6.4650,3.4400 6.4450))', 4326)),
        ('Lekki 1 and 2 to Chevron', ST_GeomFromText('POLYGON((3.4500 6.4150,3.6100 6.4150,3.6100 6.4750,3.4500 6.4750,3.4500 6.4150))', 4326))
      ON CONFLICT ("name") DO NOTHING
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "recipient_id" uuid NOT NULL,
        "recipient_role" "user_role" NOT NULL,
        "type" varchar(80) NOT NULL,
        "title" varchar(160) NOT NULL,
        "body" text NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_notifications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_notifications_recipient" ON "notifications" ("recipient_id", "recipient_role")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rider_locations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "rider_id" uuid NOT NULL,
        "master_order_id" uuid,
        "geom" geometry(Point, 4326) NOT NULL,
        "recorded_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_rider_locations" PRIMARY KEY ("id"),
        CONSTRAINT "fk_rider_locations_rider" FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_rider_locations_master_order" FOREIGN KEY ("master_order_id") REFERENCES "master_orders"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_rider_locations_rider_recorded" ON "rider_locations" ("rider_id", "recorded_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_rider_locations_geom" ON "rider_locations" USING GIST ("geom")`,
    );

    await queryRunner.query(`
      ALTER TABLE "master_orders"
        ADD COLUMN IF NOT EXISTS "vat_minor" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "delivery_mode" varchar(20) NOT NULL DEFAULT 'DELIVERY',
        ADD COLUMN IF NOT EXISTS "delivery_address" text,
        ADD COLUMN IF NOT EXISTS "delivery_latitude" double precision,
        ADD COLUMN IF NOT EXISTS "delivery_longitude" double precision,
        ADD COLUMN IF NOT EXISTS "payment_reference" varchar(120)
    `);

    await queryRunner.query(`
      ALTER TABLE "sub_orders"
        ADD COLUMN IF NOT EXISTS "commission_minor" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "net_minor" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "master_order_id" uuid NOT NULL,
        "amount_minor" integer NOT NULL,
        "currency" char(3) NOT NULL DEFAULT 'NGN',
        "gateway" varchar(40) NOT NULL,
        "reference" varchar(120) NOT NULL,
        "status" "payment_status" NOT NULL DEFAULT 'PENDING',
        "checkout_url" text,
        "split_breakdown" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "provider_response" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_payments" PRIMARY KEY ("id"),
        CONSTRAINT "uq_payments_reference" UNIQUE ("reference"),
        CONSTRAINT "fk_payments_master_order" FOREIGN KEY ("master_order_id") REFERENCES "master_orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_payments_amount_nonnegative" CHECK ("amount_minor" >= 0)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(
      `ALTER TABLE "sub_orders" DROP COLUMN IF EXISTS "net_minor", DROP COLUMN IF EXISTS "commission_minor"`,
    );
    await queryRunner.query(`
      ALTER TABLE "master_orders"
        DROP COLUMN IF EXISTS "payment_reference",
        DROP COLUMN IF EXISTS "delivery_longitude",
        DROP COLUMN IF EXISTS "delivery_latitude",
        DROP COLUMN IF EXISTS "delivery_address",
        DROP COLUMN IF EXISTS "delivery_mode",
        DROP COLUMN IF EXISTS "vat_minor"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "rider_locations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "geofence_zones"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "delivery_addresses"`);
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "pending_email_hash",
        DROP COLUMN IF EXISTS "pending_email_encrypted",
        DROP COLUMN IF EXISTS "pending_phone_hash",
        DROP COLUMN IF EXISTS "pending_phone_encrypted",
        DROP COLUMN IF EXISTS "vehicle_type",
        DROP COLUMN IF EXISTS "plate_number",
        DROP COLUMN IF EXISTS "rider_status"
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status"`);
  }
}
