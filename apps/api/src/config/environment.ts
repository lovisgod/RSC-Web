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
  JWT_SECRET: string;
  ACCESS_TOKEN_TTL_SECONDS: number;
  REFRESH_TOKEN_TTL_SECONDS: number;
  ADMIN_INACTIVITY_TIMEOUT_SECONDS: number;
  SMS_PROVIDER: "noop" | "termii";
  TERMII_BASE_URL: string;
  TERMII_API_KEY?: string;
  TERMII_SENDER_ID?: string;
  TERMII_CHANNEL: "generic" | "dnd";
  TERMII_TIMEOUT_MS: number;
  EMAIL_PROVIDER: "noop" | "smtp" | "resend";
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_SECURE?: boolean;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  RESEND_REPLY_TO?: string;
  MEDIA_PROVIDER: "noop" | "cloudinary";
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  CLOUDINARY_FOLDER: string;
  PAYMENT_PROVIDER: "local" | "paystack";
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_BASE_URL: string;
  PLATFORM_COMMISSION_BPS: number;
  VAT_BPS: number;
  DELIVERY_FEE_MINOR: number;
  PUSH_PROVIDER: "noop" | "firebase";
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
  FIREBASE_PRIVATE_KEY_BASE64?: string;
}

const base64Key = Joi.string().custom((value: string, helpers) => {
  const decoded = Buffer.from(value, "base64");

  return decoded.length === 32 ? value : helpers.error("string.base64Length");
}, "32-byte base64 key");

const environmentSchema = Joi.object<Environment>({
  NODE_ENV: Joi.string()
    .valid("development", "staging", "test", "production")
    .default("development"),
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
  JWT_SECRET: Joi.string().min(32).required(),
  ACCESS_TOKEN_TTL_SECONDS: Joi.number().integer().min(60).default(604_800),
  REFRESH_TOKEN_TTL_SECONDS: Joi.number().integer().min(3_600).default(604_800),
  ADMIN_INACTIVITY_TIMEOUT_SECONDS: Joi.number().integer().min(60).default(604_800),
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
  EMAIL_PROVIDER: Joi.string().valid("noop", "smtp", "resend").default("noop"),
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
  RESEND_API_KEY: Joi.when("EMAIL_PROVIDER", {
    is: "resend",
    then: Joi.string().min(10).required(),
    otherwise: Joi.string().optional().allow(""),
  }),
  RESEND_FROM: Joi.when("EMAIL_PROVIDER", {
    is: "resend",
    then: Joi.string().min(3).required(),
    otherwise: Joi.string().optional().allow(""),
  }),
  RESEND_REPLY_TO: Joi.string().email().optional().allow(""),
  MEDIA_PROVIDER: Joi.string().valid("noop", "cloudinary").default("noop"),
  CLOUDINARY_CLOUD_NAME: Joi.when("MEDIA_PROVIDER", {
    is: "cloudinary",
    then: Joi.string().min(2).required(),
    otherwise: Joi.string().optional().allow(""),
  }),
  CLOUDINARY_API_KEY: Joi.when("MEDIA_PROVIDER", {
    is: "cloudinary",
    then: Joi.string().min(2).required(),
    otherwise: Joi.string().optional().allow(""),
  }),
  CLOUDINARY_API_SECRET: Joi.when("MEDIA_PROVIDER", {
    is: "cloudinary",
    then: Joi.string().min(2).required(),
    otherwise: Joi.string().optional().allow(""),
  }),
  CLOUDINARY_FOLDER: Joi.string().min(1).default("rsc"),
  PAYMENT_PROVIDER: Joi.string().valid("local", "paystack").default("local"),
  PAYSTACK_SECRET_KEY: Joi.when("PAYMENT_PROVIDER", {
    is: "paystack",
    then: Joi.string().min(10).required(),
    otherwise: Joi.string().optional().allow(""),
  }),
  PAYSTACK_BASE_URL: Joi.string()
    .uri({ scheme: ["https"] })
    .default("https://api.paystack.co"),
  PLATFORM_COMMISSION_BPS: Joi.number().integer().min(0).max(10_000).default(1_000),
  VAT_BPS: Joi.number().integer().min(0).max(10_000).default(750),
  DELIVERY_FEE_MINOR: Joi.number().integer().min(0).default(1_500_00),
  PUSH_PROVIDER: Joi.string().valid("noop", "firebase").default("noop"),
  FIREBASE_PROJECT_ID: Joi.when("PUSH_PROVIDER", {
    is: "firebase",
    then: Joi.string().min(3).required(),
    otherwise: Joi.string().optional().allow(""),
  }),
  FIREBASE_CLIENT_EMAIL: Joi.when("PUSH_PROVIDER", {
    is: "firebase",
    then: Joi.string().email().required(),
    otherwise: Joi.string().optional().allow(""),
  }),
  FIREBASE_PRIVATE_KEY: Joi.string().optional().allow(""),
  FIREBASE_PRIVATE_KEY_BASE64: Joi.string().optional().allow(""),
})
  .when(Joi.object({ PUSH_PROVIDER: Joi.valid("firebase") }).unknown(), {
    then: Joi.object({
      FIREBASE_PRIVATE_KEY: Joi.when("FIREBASE_PRIVATE_KEY_BASE64", {
        is: Joi.string().min(1).required(),
        then: Joi.string().optional().allow(""),
        otherwise: Joi.string().min(100).required(),
      }),
    }),
  })
  .unknown(true);

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
