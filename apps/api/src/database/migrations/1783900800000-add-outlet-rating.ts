import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOutletRating1783900800000 implements MigrationInterface {
  name = "AddOutletRating1783900800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "outlets"
        ADD COLUMN IF NOT EXISTS "rating_average" numeric(3,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "rating_count" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outlet_ratings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "outlet_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "rating" integer NOT NULL,
        "comment" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_outlet_ratings" PRIMARY KEY ("id"),
        CONSTRAINT "fk_outlet_ratings_outlet" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_outlet_ratings_customer" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "ck_outlet_ratings_value" CHECK ("rating" BETWEEN 1 AND 5),
        CONSTRAINT "uq_outlet_ratings_user_outlet" UNIQUE ("outlet_id", "customer_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_outlet_ratings_outlet" ON "outlet_ratings" ("outlet_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "outlet_ratings"`);
    await queryRunner.query(`
      ALTER TABLE "outlets"
        DROP COLUMN IF EXISTS "rating_count",
        DROP COLUMN IF EXISTS "rating_average"
    `);
  }
}
