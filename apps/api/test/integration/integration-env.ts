import { config as loadEnvironment } from "dotenv";

const TEST_DATABASE_NAME_SUFFIX = "_test";

export function applyIntegrationEnvironment(): void {
  loadEnvironment({ path: ".env", quiet: true });

  const databaseUrl = integrationDatabaseUrl(
    process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL,
  );

  process.env.NODE_ENV = "test";
  process.env.PORT = "0";
  process.env.APP_VERSION = "integration-test";
  process.env.LOG_LEVEL = "error";
  process.env.CORS_ORIGINS = "http://127.0.0.1";
  process.env.CUSTOMER_WEB_URL = "http://127.0.0.1:3000";
  process.env.DATABASE_URL = databaseUrl;
  process.env.DATABASE_SSL = "false";
  process.env.REDIS_URL =
    process.env.TEST_REDIS_URL ??
    redisTestUrl(process.env.REDIS_URL) ??
    "redis://127.0.0.1:6379/15";
  process.env.SWAGGER_ENABLED = "false";
  process.env.PII_ENCRYPTION_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  process.env.PII_HASH_PEPPER = "integration-test-pii-hash-pepper-000000000000";
  process.env.OTP_PEPPER = "integration-test-otp-pepper-0000000000000000";
  process.env.JWT_SECRET = "integration-test-jwt-secret-0000000000000000";
  process.env.ACCESS_TOKEN_TTL_SECONDS = "900";
  process.env.REFRESH_TOKEN_TTL_SECONDS = "604800";
  process.env.ADMIN_INACTIVITY_TIMEOUT_SECONDS = "1800";
  process.env.SMS_PROVIDER = "noop";
  process.env.EMAIL_PROVIDER = "noop";
  process.env.MEDIA_PROVIDER = "noop";
  process.env.PUSH_PROVIDER = "noop";
  process.env.PAYMENT_PROVIDER = "local";
  process.env.ADDRESS_AUTOCOMPLETE_PROVIDER = "google";
  process.env.PREPARATION_SUGGESTIONS_AI_PROVIDER = "noop";
}

function integrationDatabaseUrl(configuredUrl: string | undefined): string {
  const value = configuredUrl ?? "postgresql://rsc:rsc_local_password@127.0.0.1:5432/rsc";
  const parsed = new URL(value);
  const databaseName = parsed.pathname.slice(1);

  if (!databaseName.endsWith(TEST_DATABASE_NAME_SUFFIX)) {
    parsed.pathname = `/${databaseName}${TEST_DATABASE_NAME_SUFFIX}`;
  }

  return parsed.toString();
}

function redisTestUrl(configuredUrl: string | undefined): string | null {
  if (!configuredUrl) {
    return null;
  }

  const parsed = new URL(configuredUrl);
  parsed.pathname = "/15";
  return parsed.toString();
}

export function assertTestDatabaseUrl(databaseUrl: string): URL {
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.slice(1);

  if (!databaseName.endsWith(TEST_DATABASE_NAME_SUFFIX) || !/^[a-zA-Z0-9_]+$/.test(databaseName)) {
    throw new Error(
      `Integration tests require a database whose name ends with ${TEST_DATABASE_NAME_SUFFIX}`,
    );
  }

  return parsed;
}
