import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditLogs1784937600000 implements MigrationInterface {
  name = "AddAuditLogs1784937600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "actor_id" uuid,
        "actor_role" varchar(40),
        "action" varchar(160) NOT NULL,
        "method" varchar(12) NOT NULL,
        "path" varchar(512) NOT NULL,
        "status_code" integer NOT NULL,
        "resource_type" varchar(80),
        "resource_id" varchar(160),
        "request_id" varchar(80),
        "ip_address" varchar(80),
        "user_agent" varchar(512),
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "fk_audit_logs_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_audit_logs_created_at"
      ON "audit_logs" ("created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_audit_logs_actor"
      ON "audit_logs" ("actor_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_audit_logs_resource"
      ON "audit_logs" ("resource_type", "resource_id", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "ix_audit_logs_resource"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "ix_audit_logs_actor"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "ix_audit_logs_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
  }
}
