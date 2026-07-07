import type { ConfigService } from "@nestjs/config";
import { describe, expect, it } from "vitest";

import type { ApplicationConfig } from "../../config/configuration";
import { PiiCryptoService } from "./pii-crypto.service";

function createService(): PiiCryptoService {
  const config = {
    get: () => ({
      piiEncryptionKey: Buffer.alloc(32, 7).toString("base64"),
      piiHashPepper: "a".repeat(32),
      otpPepper: "b".repeat(32),
    }),
  } as unknown as ConfigService<ApplicationConfig, true>;

  return new PiiCryptoService(config);
}

describe(PiiCryptoService.name, () => {
  it("encrypts with randomized authenticated encryption", () => {
    const service = createService();
    const first = service.encrypt("ada@example.com");
    const second = service.encrypt("ada@example.com");

    expect(first).not.toBe(second);
    expect(first).not.toContain("ada@example.com");
    expect(service.decrypt(first)).toBe("ada@example.com");
    expect(service.decrypt(second)).toBe("ada@example.com");
  });

  it("creates deterministic peppered SHA-256 search hashes", () => {
    const service = createService();

    expect(service.searchHash("ada@example.com")).toBe(service.searchHash("ada@example.com"));
    expect(service.searchHash("ada@example.com")).toMatch(/^[a-f0-9]{64}$/);
    expect(service.searchHash("ada@example.com")).not.toBe(service.searchHash("other@example.com"));
  });

  it("rejects tampered ciphertext", () => {
    const service = createService();
    const encrypted = service.encrypt("08031234567");

    // Tamper the encrypted payload segment (index 3) by flipping a bit
    // in the middle of its binary content. Changing only the last base64url
    // character is unreliable because padding bits may absorb the edit.
    const parts = encrypted.split(".");
    const payloadBytes = Buffer.from(parts[3]!, "base64url");
    payloadBytes[Math.floor(payloadBytes.length / 2)] ^= 0xff;
    parts[3] = payloadBytes.toString("base64url");
    const tampered = parts.join(".");

    expect(() => service.decrypt(tampered)).toThrow();
  });
});
