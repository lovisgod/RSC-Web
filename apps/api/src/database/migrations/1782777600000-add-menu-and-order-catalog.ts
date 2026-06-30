import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMenuAndOrderCatalog1782777600000 implements MigrationInterface {
  name = "AddMenuAndOrderCatalog1782777600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'master_order_status') THEN
          CREATE TYPE "master_order_status" AS ENUM (
            'PENDING_PAYMENT',
            'CONFIRMED',
            'PARTIALLY_READY',
            'READY',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
            'CANCELLED'
          );
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sub_order_status') THEN
          CREATE TYPE "sub_order_status" AS ENUM (
            'PENDING',
            'ACCEPTED',
            'PREPARING',
            'READY',
            'COLLECTED',
            'DISPATCHED',
            'REJECTED'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "menu_categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "outlet_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_menu_categories" PRIMARY KEY ("id"),
        CONSTRAINT "fk_menu_categories_outlet" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_menu_categories_outlet" ON "menu_categories" ("outlet_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "menu_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "outlet_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        "name" varchar(160) NOT NULL,
        "description" text,
        "image_url" varchar(512),
        "price_minor" integer NOT NULL,
        "currency" char(3) NOT NULL DEFAULT 'NGN',
        "is_available" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_menu_items" PRIMARY KEY ("id"),
        CONSTRAINT "fk_menu_items_outlet" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_menu_items_category" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_menu_items_price_nonnegative" CHECK ("price_minor" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_menu_items_outlet" ON "menu_items" ("outlet_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_menu_items_category" ON "menu_items" ("category_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "item_modifier_groups" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "outlet_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "min_selections" integer NOT NULL DEFAULT 0,
        "max_selections" integer NOT NULL DEFAULT 1,
        "is_required" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_item_modifier_groups" PRIMARY KEY ("id"),
        CONSTRAINT "fk_item_modifier_groups_outlet" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_item_modifier_groups_selection_bounds" CHECK ("min_selections" >= 0 AND "max_selections" >= "min_selections")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_item_modifier_groups_outlet" ON "item_modifier_groups" ("outlet_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "item_modifiers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "outlet_id" uuid NOT NULL,
        "group_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "price_delta_minor" integer NOT NULL DEFAULT 0,
        "currency" char(3) NOT NULL DEFAULT 'NGN',
        "is_available" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_item_modifiers" PRIMARY KEY ("id"),
        CONSTRAINT "fk_item_modifiers_outlet" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_item_modifiers_group" FOREIGN KEY ("group_id") REFERENCES "item_modifier_groups"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_item_modifiers_group" ON "item_modifiers" ("group_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_item_modifiers_outlet" ON "item_modifiers" ("outlet_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "menu_item_modifier_groups" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "menu_item_id" uuid NOT NULL,
        "group_id" uuid NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_menu_item_modifier_groups" PRIMARY KEY ("id"),
        CONSTRAINT "fk_menu_item_modifier_groups_item" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_menu_item_modifier_groups_group" FOREIGN KEY ("group_id") REFERENCES "item_modifier_groups"("id") ON DELETE RESTRICT,
        CONSTRAINT "uq_menu_item_modifier_groups_item_group" UNIQUE ("menu_item_id", "group_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "master_orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL,
        "status" "master_order_status" NOT NULL DEFAULT 'PENDING_PAYMENT',
        "subtotal_minor" integer NOT NULL DEFAULT 0,
        "delivery_fee_minor" integer NOT NULL DEFAULT 0,
        "service_fee_minor" integer NOT NULL DEFAULT 0,
        "discount_minor" integer NOT NULL DEFAULT 0,
        "total_minor" integer NOT NULL DEFAULT 0,
        "currency" char(3) NOT NULL DEFAULT 'NGN',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_master_orders" PRIMARY KEY ("id"),
        CONSTRAINT "fk_master_orders_customer" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_master_orders_amounts_nonnegative" CHECK (
          "subtotal_minor" >= 0 AND "delivery_fee_minor" >= 0 AND "service_fee_minor" >= 0 AND "discount_minor" >= 0 AND "total_minor" >= 0
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_master_orders_customer" ON "master_orders" ("customer_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sub_orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "master_order_id" uuid NOT NULL,
        "outlet_id" uuid NOT NULL,
        "status" "sub_order_status" NOT NULL DEFAULT 'PENDING',
        "subtotal_minor" integer NOT NULL DEFAULT 0,
        "currency" char(3) NOT NULL DEFAULT 'NGN',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_sub_orders" PRIMARY KEY ("id"),
        CONSTRAINT "fk_sub_orders_master" FOREIGN KEY ("master_order_id") REFERENCES "master_orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_sub_orders_outlet" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_sub_orders_subtotal_nonnegative" CHECK ("subtotal_minor" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_sub_orders_master" ON "sub_orders" ("master_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_sub_orders_outlet" ON "sub_orders" ("outlet_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_line_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "master_order_id" uuid NOT NULL,
        "sub_order_id" uuid NOT NULL,
        "outlet_id" uuid NOT NULL,
        "menu_item_id" uuid,
        "item_name_snapshot" varchar(160) NOT NULL,
        "unit_price_minor" integer NOT NULL,
        "quantity" integer NOT NULL,
        "line_total_minor" integer NOT NULL,
        "currency" char(3) NOT NULL DEFAULT 'NGN',
        "modifiers_snapshot" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_order_line_items" PRIMARY KEY ("id"),
        CONSTRAINT "fk_order_line_items_master" FOREIGN KEY ("master_order_id") REFERENCES "master_orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_order_line_items_sub_order" FOREIGN KEY ("sub_order_id") REFERENCES "sub_orders"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_order_line_items_outlet" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_order_line_items_menu_item" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE SET NULL,
        CONSTRAINT "ck_order_line_items_amounts_nonnegative" CHECK ("unit_price_minor" >= 0 AND "quantity" > 0 AND "line_total_minor" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_order_line_items_master" ON "order_line_items" ("master_order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_order_line_items_sub_order" ON "order_line_items" ("sub_order_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "order_line_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sub_orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "master_orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_item_modifier_groups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "item_modifiers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "item_modifier_groups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_categories"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sub_order_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "master_order_status"`);
  }
}
