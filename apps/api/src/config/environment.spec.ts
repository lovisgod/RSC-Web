import { afterEach, describe, expect, it } from "vitest";

import configuration from "./configuration";
import { validateEnvironment } from "./environment";

const originalEnvironment = { ...process.env };
const firebasePrivateKey = [
  "-----BEGIN PRIVATE KEY-----",
  "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
  "-----END PRIVATE KEY-----",
].join("\n");
const baseConfig = {
  DATABASE_URL: "postgresql://rsc:password@localhost:5432/rsc",
  REDIS_URL: "redis://localhost:6379",
  PII_ENCRYPTION_KEY: Buffer.alloc(32, "a").toString("base64"),
  PII_HASH_PEPPER: "x".repeat(32),
  OTP_PEPPER: "y".repeat(32),
  JWT_SECRET: "z".repeat(32),
};

describe("environment configuration", () => {
  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it("accepts Firebase private keys supplied as base64", () => {
    expect(() =>
      validateEnvironment({
        ...baseConfig,
        PUSH_PROVIDER: "firebase",
        FIREBASE_PROJECT_ID: "rsc-dev",
        FIREBASE_CLIENT_EMAIL: "firebase-adminsdk@example.iam.gserviceaccount.com",
        FIREBASE_PRIVATE_KEY_BASE64: Buffer.from(firebasePrivateKey, "utf8").toString("base64"),
      }),
    ).not.toThrow();
  });

  it("decodes Firebase private keys supplied as base64", () => {
    process.env = {
      ...originalEnvironment,
      FIREBASE_PRIVATE_KEY_BASE64: Buffer.from(firebasePrivateKey, "utf8").toString("base64"),
    };

    expect(configuration().push.firebase.privateKey).toBe(firebasePrivateKey);
  });

  it("still rejects Firebase config without any private key", () => {
    expect(() =>
      validateEnvironment({
        ...baseConfig,
        PUSH_PROVIDER: "firebase",
        FIREBASE_PROJECT_ID: "rsc-dev",
        FIREBASE_CLIENT_EMAIL: "firebase-adminsdk@example.iam.gserviceaccount.com",
      }),
    ).toThrow(/FIREBASE_PRIVATE_KEY/);
  });
});
