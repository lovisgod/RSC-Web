import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationCampaigns1783209600000 implements MigrationInterface {
  name = "AddNotificationCampaigns1783209600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_campaigns" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_by_id" uuid NOT NULL,
        "title" varchar(160) NOT NULL,
        "body" text NOT NULL,
        "target_segment" varchar(60) NOT NULL,
        "deep_link" varchar(512),
        "scheduled_at" timestamptz NOT NULL,
        "status" varchar(40) NOT NULL DEFAULT 'SCHEDULED',
        "total_targeted" integer NOT NULL DEFAULT 0,
        "sent_count" integer NOT NULL DEFAULT 0,
        "failed_count" integer NOT NULL DEFAULT 0,
        "dispatched_at" timestamptz,
        "failure_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_notification_campaigns" PRIMARY KEY ("id"),
        CONSTRAINT "fk_notification_campaigns_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_notification_campaign_counts_nonnegative" CHECK (
          "total_targeted" >= 0 AND "sent_count" >= 0 AND "failed_count" >= 0
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "ix_notification_campaigns_scheduled_at" ON "notification_campaigns" ("scheduled_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_campaigns"`);
  }
}
