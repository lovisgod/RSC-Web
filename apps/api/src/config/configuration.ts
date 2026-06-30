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
    jwtSecret: string;
    accessTokenTtlSeconds: number;
    refreshTokenTtlSeconds: number;
    adminInactivityTimeoutSeconds: number;
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
  email: {
    provider: "noop" | "smtp" | "resend";
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      from: string;
    };
    resend: {
      apiKey: string;
      from: string;
      replyTo: string;
    };
  };
  payments: {
    provider: "local" | "paystack";
    paystack: {
      secretKey: string;
      baseUrl: string;
    };
    platformCommissionBps: number;
    vatBps: number;
    deliveryFeeMinor: number;
  };
  push: {
    provider: "noop" | "firebase";
    firebase: {
      projectId: string;
      clientEmail: string;
      privateKey: string;
    };
  };
}

function parseOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseFirebasePrivateKey(): string {
  if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
    return Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, "base64").toString("utf8");
  }

  return (process.env.FIREBASE_PRIVATE_KEY ?? "").replaceAll("\\n", "\n");
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
      jwtSecret: process.env.JWT_SECRET ?? "",
      accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 604_800),
      refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 604_800),
      adminInactivityTimeoutSeconds: Number(
        process.env.ADMIN_INACTIVITY_TIMEOUT_SECONDS ?? 604_800,
      ),
    },
    sms: {
      provider: process.env.SMS_PROVIDER === "termii" ? "termii" : "noop",
      termii: {
        baseUrl: (process.env.TERMII_BASE_URL ?? "https://v3.api.termii.com").replace(/\/$/, ""),
        apiKey: process.env.TERMII_API_KEY ?? "",
        senderId: process.env.TERMII_SENDER_ID ?? "",
        channel: process.env.TERMII_CHANNEL === "dnd" ? "dnd" : "generic",
        timeoutMs: Number(process.env.TERMII_TIMEOUT_MS ?? 10_000),
      },
    },
    email: {
      provider:
        process.env.EMAIL_PROVIDER === "smtp"
          ? "smtp"
          : process.env.EMAIL_PROVIDER === "resend"
            ? "resend"
            : "noop",
      smtp: {
        host: process.env.SMTP_HOST ?? "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        user: process.env.SMTP_USER ?? "",
        pass: process.env.SMTP_PASS ?? "",
        from: process.env.SMTP_FROM ?? "RSC <noreply@rscdev.tech>",
      },
      resend: {
        apiKey: process.env.RESEND_API_KEY ?? "",
        from: process.env.RESEND_FROM ?? "RSC <onboarding@resend.dev>",
        replyTo: process.env.RESEND_REPLY_TO ?? "",
      },
    },
    payments: {
      provider: process.env.PAYMENT_PROVIDER === "paystack" ? "paystack" : "local",
      paystack: {
        secretKey: process.env.PAYSTACK_SECRET_KEY ?? "",
        baseUrl: (process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co").replace(/\/$/, ""),
      },
      platformCommissionBps: Number(process.env.PLATFORM_COMMISSION_BPS ?? 1_000),
      vatBps: Number(process.env.VAT_BPS ?? 750),
      deliveryFeeMinor: Number(process.env.DELIVERY_FEE_MINOR ?? 1_500_00),
    },
    push: {
      provider: process.env.PUSH_PROVIDER === "firebase" ? "firebase" : "noop",
      firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID ?? "",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
        privateKey: parseFirebasePrivateKey(),
      },
    },
  };
}
