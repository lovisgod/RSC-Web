import Joi from "joi";

export type NodeEnvironment = "development" | "test" | "production";

export interface Environment {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  APP_VERSION: string;
  LOG_LEVEL: string;
  CORS_ORIGINS: string;
  DATABASE_URL: string;
  DATABASE_SSL: boolean;
  REDIS_URL: string;
  SWAGGER_ENABLED: boolean;
}

const environmentSchema = Joi.object<Environment>({
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),
  PORT: Joi.number().port().default(4000),
  APP_VERSION: Joi.string().default("development"),
  LOG_LEVEL: Joi.string()
    .valid("fatal", "error", "warn", "log", "debug", "verbose")
    .default("log"),
  CORS_ORIGINS: Joi.string().default(
    "http://localhost:3000,http://localhost:5173",
  ),
  DATABASE_URL: Joi.string().uri({ scheme: ["postgres", "postgresql"] }).required(),
  DATABASE_SSL: Joi.boolean().truthy("true").falsy("false").default(false),
  REDIS_URL: Joi.string().uri({ scheme: ["redis", "rediss"] }).required(),
  SWAGGER_ENABLED: Joi.boolean().truthy("true").falsy("false").default(true),
}).unknown(true);

export function validateEnvironment(config: Record<string, unknown>): Environment {
  const result = environmentSchema.validate(config, {
    abortEarly: false,
    convert: true,
  });

  if (result.error) {
    throw new Error(`Environment validation failed: ${result.error.message}`);
  }

  return result.value;
}
