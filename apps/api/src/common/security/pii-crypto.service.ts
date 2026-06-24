import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApplicationConfig } from "../../config/configuration";

const ENCRYPTION_VERSION = "v1";
const IV_LENGTH_BYTES = 12;

@Injectable()
export class PiiCryptoService {
  private readonly encryptionKey: Buffer;
  private readonly hashPepper: string;

  constructor(configService: ConfigService<ApplicationConfig, true>) {
    const security = configService.get("security", { infer: true });

    this.encryptionKey = Buffer.from(security.piiEncryptionKey, "base64");
    this.hashPepper = security.piiHashPepper;
  }

  encrypt(value: string): string {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
      ENCRYPTION_VERSION,
      iv.toString("base64url"),
      authTag.toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".");
  }

  decrypt(value: string): string {
    const [version, iv, authTag, encrypted] = value.split(".");

    if (version !== ENCRYPTION_VERSION || !iv || !authTag || !encrypted) {
      throw new Error("Unsupported encrypted value format");
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(authTag, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }

  searchHash(normalizedValue: string): string {
    return createHash("sha256")
      .update(this.hashPepper)
      .update("\0")
      .update(normalizedValue)
      .digest("hex");
  }
}
