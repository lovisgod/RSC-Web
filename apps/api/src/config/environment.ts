import Joi from "joi";

export type NodeEnvironment = "development" | "staging" | "production";

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
  PII_ENCRYPTION_KEY: string;
  PII_HASH_PEPPER: string;
  OTP_PEPPER: string;
  SMS_PROVIDER: "noop" | "termii";
  TERMII_BASE_URL: string;
  TERMII_API_KEY?: string;
  TERMII_SENDER_ID?: string;
  TERMII_CHANNEL: "generic" | "dnd";
  TERMII_TIMEOUT_MS: number;
  EMAIL_PROVIDER: "noop" | "smtp";
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_SECURE?: boolean;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
}

const base64Key = Joi.string().custom((value: string, helpers) => {
  const decoded = Buffer.from(value, "base64");

  return decoded.length === 32 ? value : helpers.error("string.base64Length");
}, "32-byte base64 key");

const environmentSchema = Joi.object<Environment>({
  NODE_ENV: Joi.string().valid("development", "staging", "test", "production").default("development"),
  PORT: Joi.number().port().default(4000),
  APP_VERSION: Joi.string().default("development"),
  LOG_LEVEL: Joi.string().valid("fatal", "error", "warn", "log", "debug", "verbose").default("log"),
  CORS_ORIGINS: Joi.string().default("http://localhost:3000,http://localhost:5173"),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ["postgres", "postgresql"] })
    .required(),
  DATABASE_SSL: Joi.boolean().truthy("true").falsy("false").default(false),
  REDIS_URL: Joi.string()
    .uri({ scheme: ["redis", "rediss"] })
    .required(),
  SWAGGER_ENABLED: Joi.boolean().truthy("true").falsy("false").default(true),
  PII_ENCRYPTION_KEY: base64Key.required().messages({
    "string.base64Length": "PII_ENCRYPTION_KEY must decode to exactly 32 bytes",
  }),
  PII_HASH_PEPPER: Joi.string().min(32).required(),
  OTP_PEPPER: Joi.string().min(32).required(),
  SMS_PROVIDER: Joi.string().valid("noop", "termii").default("noop"),
  TERMII_BASE_URL: Joi.string()
    .uri({ scheme: ["https"] })
    .default("https://v3.api.termii.com"),
  TERMII_API_KEY: Joi.when("SMS_PROVIDER", {
    is: "termii",
    then: Joi.string().min(10).required(),
    otherwise: Joi.string().optional().allow(""),
  }),
  TERMII_SENDER_ID: Joi.when("SMS_PROVIDER", {
    is: "termii",
    then: Joi.string().min(3).max(11).required(),
    otherwise: Joi.string().optional().allow(""),
  }),
  TERMII_CHANNEL: Joi.string().valid("generic", "dnd").default("generic"),
  TERMII_TIMEOUT_MS: Joi.number().integer().min(1_000).max(30_000).default(10_000),
  EMAIL_PROVIDER: Joi.string().valid("noop", "smtp").default("noop"),
  SMTP_HOST: Joi.when("EMAIL_PROVIDER", {
    is: "smtp",
    then: Joi.string().min(3).required(),
    otherwise: Joi.string().optional().allow(""),
  }),
  SMTP_PORT: Joi.when("EMAIL_PROVIDER", {
    is: "smtp",
    then: Joi.number().port().default(587),
    otherwise: Joi.number().optional(),
  }),
  SMTP_SECURE: Joi.boolean().truthy("true").falsy("false").default(false),
  SMTP_USER: Joi.when("EMAIL_PROVIDER", {
    is: "smtp",
    then: Joi.string().min(3).required(),
    otherwise: Joi.string().optional().allow(""),
  }),
  SMTP_PASS: Joi.when("EMAIL_PROVIDER", {
    is: "smtp",
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().optional().allow(""),
  }),
  SMTP_FROM: Joi.when("EMAIL_PROVIDER", {
    is: "smtp",
    then: Joi.string().min(3).required(),
    otherwise: Joi.string().optional().allow(""),
  }),
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
