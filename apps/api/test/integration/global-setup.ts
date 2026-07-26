import "reflect-metadata";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import Redis from "ioredis";
import { Client } from "pg";

import { applyIntegrationEnvironment, assertTestDatabaseUrl } from "./integration-env";

const execFileAsync = promisify(execFile);

export default async function setup() {
  applyIntegrationEnvironment();

  const databaseUrl = process.env.DATABASE_URL!;
  const parsed = assertTestDatabaseUrl(databaseUrl);
  const databaseName = parsed.pathname.slice(1);
  const administrativeUrl = new URL(databaseUrl);
  administrativeUrl.pathname = "/postgres";

  const administrativeClient = new Client({ connectionString: administrativeUrl.toString() });
  await administrativeClient.connect();
  const existing = await administrativeClient.query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
    [databaseName],
  );
  if (!existing.rows[0]?.exists) {
    await administrativeClient.query(`CREATE DATABASE "${databaseName}"`);
  }
  await administrativeClient.end();

  const testClient = new Client({ connectionString: databaseUrl });
  await testClient.connect();
  await testClient.query("DROP SCHEMA public CASCADE");
  await testClient.query("CREATE SCHEMA public");
  await testClient.end();

  await execFileAsync(
    "pnpm",
    ["exec", "typeorm-ts-node-commonjs", "migration:run", "-d", "src/database/data-source.ts"],
    {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  const redis = new Redis(process.env.REDIS_URL!, { lazyConnect: true, maxRetriesPerRequest: 1 });
  await redis.connect();
  await redis.flushdb();
  await redis.quit();

  return async () => {
    const cleanupRedis = new Redis(process.env.REDIS_URL!, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    await cleanupRedis.connect();
    await cleanupRedis.flushdb();
    await cleanupRedis.quit();
  };
}
