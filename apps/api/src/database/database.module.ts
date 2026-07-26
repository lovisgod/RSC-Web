import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import type { ApplicationConfig } from "../config/configuration";
import { createDataSourceOptions } from "./data-source-options";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ApplicationConfig, true>) => {
        const database = configService.get("database", { infer: true });
        const isTestEnvironment = configService.get("app.environment", { infer: true }) === "test";

        process.env.DATABASE_URL = database.url;
        process.env.DATABASE_SSL = String(database.ssl);

        return {
          ...createDataSourceOptions(),
          ...(isTestEnvironment ? { entities: [], migrations: [] } : {}),
          autoLoadEntities: true,
          retryAttempts: 5,
          retryDelay: 2_000,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
