import { scryptSync, timingSafeEqual } from "node:crypto";

import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;
const LEGACY_KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (passwordHash.startsWith("$2a$") || passwordHash.startsWith("$2b$") || passwordHash.startsWith("$2y$")) {
    return bcrypt.compare(password, passwordHash);
  }

  return verifyLegacyScryptPassword(password, passwordHash);
}

export function isBcryptHash(passwordHash: string): boolean {
  return passwordHash.startsWith("$2a$") || passwordHash.startsWith("$2b$") || passwordHash.startsWith("$2y$");
}

function verifyLegacyScryptPassword(password: string, passwordHash: string): boolean {
  const [salt, expectedHex] = passwordHash.split(":");

  if (!salt || !expectedHex) {
    return false;
  }

  const actual = scryptSync(password, salt, LEGACY_KEY_LENGTH);
  const expected = Buffer.from(expectedHex, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
