import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOutletBannersAndMenuItemDiscounts1785196800000 implements MigrationInterface {
  name = "AddOutletBannersAndMenuItemDiscounts1785196800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE outlets
      ADD COLUMN banner_url varchar(512)
    `);
    await queryRunner.query(`
      ALTER TABLE menu_items
      ADD COLUMN discount_price_minor integer,
      ADD COLUMN discount_starts_at timestamptz,
      ADD COLUMN discount_ends_at timestamptz
    `);
    await queryRunner.query(`
      ALTER TABLE menu_items
      ADD CONSTRAINT ck_menu_items_discount_price
      CHECK (
        discount_price_minor IS NULL
        OR (discount_price_minor > 0 AND discount_price_minor < price_minor)
      )
    `);
    await queryRunner.query(`
      ALTER TABLE menu_items
      ADD CONSTRAINT ck_menu_items_discount_window
      CHECK (
        discount_starts_at IS NULL
        OR discount_ends_at IS NULL
        OR discount_ends_at > discount_starts_at
      )
    `);
    await queryRunner.query(`
      CREATE INDEX ix_menu_items_active_discount
      ON menu_items (discount_starts_at, discount_ends_at)
      WHERE discount_price_minor IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS ix_menu_items_active_discount");
    await queryRunner.query(
      "ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS ck_menu_items_discount_window",
    );
    await queryRunner.query(
      "ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS ck_menu_items_discount_price",
    );
    await queryRunner.query(`
      ALTER TABLE menu_items
      DROP COLUMN discount_ends_at,
      DROP COLUMN discount_starts_at,
      DROP COLUMN discount_price_minor
    `);
    await queryRunner.query("ALTER TABLE outlets DROP COLUMN banner_url");
  }
}
