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
  security: {
    piiEncryptionKey: string;
    piiHashPepper: string;
    otpPepper: string;
  };
  sms: {
    provider: "noop" | "termii";
    termii: {
      baseUrl: string;
      apiKey: string;
      senderId: string;
      channel: "generic" | "dnd";
      timeoutMs: number;
    };
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
    security: {
      piiEncryptionKey: process.env.PII_ENCRYPTION_KEY ?? "",
      piiHashPepper: process.env.PII_HASH_PEPPER ?? "",
      otpPepper: process.env.OTP_PEPPER ?? "",
    },
    sms: {
      provider: process.env.SMS_PROVIDER === "termii" ? "termii" : "noop",
      termii: {
        baseUrl: (process.env.TERMII_BASE_URL ?? "https://api.ng.termii.com").replace(/\/$/, ""),
        apiKey: process.env.TERMII_API_KEY ?? "",
        senderId: process.env.TERMII_SENDER_ID ?? "",
        channel: process.env.TERMII_CHANNEL === "dnd" ? "dnd" : "generic",
        timeoutMs: Number(process.env.TERMII_TIMEOUT_MS ?? 10_000),
      },
    },
  };
}
