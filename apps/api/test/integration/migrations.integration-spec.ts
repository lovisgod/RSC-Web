import type { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createIntegrationApp } from "./test-app";

describe("database migrations", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = await createIntegrationApp();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("boots AppModule against a schema built entirely from migrations", async () => {
    const migrations = await dataSource.query<Array<{ name: string }>>(
      `SELECT name FROM typeorm_migrations ORDER BY id`,
    );
    const tables = await dataSource.query<Array<{ table_name: string }>>(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public'`,
    );

    expect(migrations.length).toBeGreaterThanOrEqual(38);
    expect(tables.map((row) => row.table_name)).toEqual(
      expect.arrayContaining([
        "users",
        "outlets",
        "master_orders",
        "sub_orders",
        "payments",
        "payment_refunds",
        "outlet_settlement_approvals",
        "audit_logs",
        "database_backup_settings",
      ]),
    );
  });

  it("installs the enum values and uniqueness constraints relied on by production", async () => {
    const roles = await dataSource.query<Array<{ enumlabel: string }>>(
      `SELECT enumlabel
         FROM pg_enum
         JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        WHERE pg_type.typname = 'user_role'`,
    );
    const indexes = await dataSource.query<Array<{ indexname: string }>>(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`,
    );

    expect(roles.map((row) => row.enumlabel)).toContain("OWNER");
    expect(indexes.map((row) => row.indexname)).toEqual(
      expect.arrayContaining([
        "uq_outlets_settlement_subaccount_code",
        "uq_payment_refunds_pending_requester",
      ]),
    );
  });
});
