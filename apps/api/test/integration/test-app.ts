import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";

import { AppModule } from "../../src/app.module";
import { configureApplication } from "../../src/bootstrap";

export async function createIntegrationApp(options: { listen?: boolean } = {}) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ rawBody: true });
  configureApplication(app);
  app.useLogger(false);

  if (options.listen) {
    await app.listen(0, "127.0.0.1");
  } else {
    await app.init();
  }

  return app;
}

export async function truncateApplicationTables(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  const rows = await dataSource.query<Array<{ tablename: string }>>(
    `SELECT tablename
       FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> 'typeorm_migrations'`,
  );

  if (rows.length === 0) {
    return;
  }

  const tables = rows.map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`).join(", ");
  await dataSource.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}
