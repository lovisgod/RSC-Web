import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPreparationSuggestions1783428120155 implements MigrationInterface {
  name = "AddPreparationSuggestions1783428120155";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "preparation_suggestions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "text" character varying(255) NOT NULL, "outlet_id" uuid, "menu_item_id" uuid, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_5fd6713699c18b1c5e69d1f16a6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_preparation_suggestions_item" ON "preparation_suggestions" ("menu_item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_preparation_suggestions_outlet" ON "preparation_suggestions" ("outlet_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."ix_preparation_suggestions_outlet"`);
    await queryRunner.query(`DROP INDEX "public"."ix_preparation_suggestions_item"`);
    await queryRunner.query(`DROP TABLE "preparation_suggestions"`);
  }
}
