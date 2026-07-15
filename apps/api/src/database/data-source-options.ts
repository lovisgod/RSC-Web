import type { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

export function createDataSourceOptions(): PostgresConnectionOptions {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return {
    type: "postgres",
    url: databaseUrl,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
    synchronize: false,
    migrationsRun: false,
    migrationsTransactionMode: "each",
    logging: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
    migrations: [`${__dirname}/migrations/*{.ts,.js}`],
    migrationsTableName: "typeorm_migrations",
  };
}
