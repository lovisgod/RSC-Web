export interface ApplicationConfig {
  app: {
    environment: string;
    port: number;
    version: string;
    corsOrigins: string[];
    swaggerEnabled: boolean;
  };
  database: {
    url: string;
    ssl: boolean;
  };
  redis: {
    url: string;
  };
}

function parseOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export default function configuration(): ApplicationConfig {
  return {
    app: {
      environment: process.env.NODE_ENV ?? "development",
      port: Number(process.env.PORT ?? 4000),
      version: process.env.APP_VERSION ?? "development",
      corsOrigins: parseOrigins(
        process.env.CORS_ORIGINS ?? "http://localhost:3000,http://localhost:5173",
      ),
      swaggerEnabled: process.env.SWAGGER_ENABLED !== "false",
    },
    database: {
      url: process.env.DATABASE_URL ?? "",
      ssl: process.env.DATABASE_SSL === "true",
    },
    redis: {
      url: process.env.REDIS_URL ?? "",
    },
  };
}
