import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import type { ApplicationConfig } from "../config/configuration";
import { REDIS_CLIENT } from "../redis/redis.constants";
import type { AuthenticatedUser } from "./authenticated-user";
import type { Customer } from "./customer.entity";
import { UserRole } from "./user-role.enum";

type TokenType = "access" | "refresh";

interface TokenPayload {
  sub: string;
  role: UserRole;
  sid: string;
  jti: string;
  typ: TokenType;
  iat: number;
  exp: number;
}

interface StoredSession {
  userId: string;
  role: UserRole;
  refreshTokenId: string;
  lastActivityAt: number;
  expiresAt: number;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresInSeconds: number;
  user: {
    id: string;
    role: UserRole;
  };
}

@Injectable()
export class AuthSessionService {
  private readonly jwtSecret: Buffer;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;
  private readonly adminInactivityTimeoutSeconds: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    configService: ConfigService<ApplicationConfig, true>,
  ) {
    const security = configService.get("security", { infer: true });

    this.jwtSecret = Buffer.from(security.jwtSecret);
    this.accessTtlSeconds = security.accessTokenTtlSeconds;
    this.refreshTtlSeconds = security.refreshTokenTtlSeconds;
    this.adminInactivityTimeoutSeconds = security.adminInactivityTimeoutSeconds;
  }

  async issueSession(user: Customer): Promise<IssuedSession> {
    const sessionId = randomUUID();
    const refreshTokenId = randomUUID();
    const now = nowSeconds();
    const expiresAt = now + this.refreshTtlSeconds;

    const accessToken = this.signToken({
      sub: user.id,
      role: user.role,
      sid: sessionId,
      jti: randomUUID(),
      typ: "access",
      iat: now,
      exp: now + this.accessTtlSeconds,
    });
    const refreshToken = this.signToken({
      sub: user.id,
      role: user.role,
      sid: sessionId,
      jti: refreshTokenId,
      typ: "refresh",
      iat: now,
      exp: expiresAt,
    });

    await this.redis.set(
      this.sessionKey(sessionId),
      JSON.stringify({
        userId: user.id,
        role: user.role,
        refreshTokenId,
        lastActivityAt: now,
        expiresAt,
      } satisfies StoredSession),
      "EX",
      this.refreshTtlSeconds,
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresInSeconds: this.accessTtlSeconds,
      refreshTokenExpiresInSeconds: this.refreshTtlSeconds,
      user: {
        id: user.id,
        role: user.role,
      },
    };
  }

  async authenticateAccessToken(token: string): Promise<AuthenticatedUser> {
    const payload = this.verifyToken(token, "access");
    const [isBlacklisted, session] = await Promise.all([
      this.redis.exists(this.blacklistKey(payload.jti)),
      this.getSession(payload.sid),
    ]);

    if (
      isBlacklisted ||
      !session ||
      session.userId !== payload.sub ||
      session.role !== payload.role
    ) {
      throw new UnauthorizedException("Authentication required");
    }

    const now = nowSeconds();

    if (
      session.role === UserRole.ADMIN &&
      now - session.lastActivityAt > this.adminInactivityTimeoutSeconds
    ) {
      await this.redis.del(this.sessionKey(payload.sid));
      throw new UnauthorizedException("Session expired");
    }

    session.lastActivityAt = now;
    await this.persistSession(payload.sid, session);

    return {
      id: payload.sub,
      role: payload.role,
      sessionId: payload.sid,
      accessTokenId: payload.jti,
    };
  }

  async revokeSession(accessToken?: string, refreshToken?: string): Promise<void> {
    const tokens = [accessToken, refreshToken].filter((token): token is string => Boolean(token));
    const payloads = tokens
      .map((token) => this.verifyTokenWithoutThrow(token))
      .filter(isTokenPayload);

    await Promise.all(
      payloads.flatMap((payload) => [
        this.redis.set(
          this.blacklistKey(payload.jti),
          "1",
          "EX",
          Math.max(payload.exp - nowSeconds(), 1),
        ),
        this.redis.del(this.sessionKey(payload.sid)),
      ]),
    );
  }

  private async getSession(sessionId: string): Promise<StoredSession | null> {
    const raw = await this.redis.get(this.sessionKey(sessionId));

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StoredSession;
  }

  private async persistSession(sessionId: string, session: StoredSession): Promise<void> {
    await this.redis.set(
      this.sessionKey(sessionId),
      JSON.stringify(session),
      "EX",
      Math.max(session.expiresAt - nowSeconds(), 1),
    );
  }

  private signToken(payload: TokenPayload): string {
    const encodedHeader = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private verifyToken(token: string, expectedType: TokenType): TokenPayload {
    const payload = this.verifyTokenWithoutThrow(token);

    if (!payload || payload.typ !== expectedType || payload.exp <= nowSeconds()) {
      throw new UnauthorizedException("Authentication required");
    }

    return payload;
  }

  private verifyTokenWithoutThrow(token: string): TokenPayload | null {
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    if (!encodedHeader || !encodedPayload || !signature) {
      return null;
    }

    const expectedSignature = this.sign(`${encodedHeader}.${encodedPayload}`);

    if (!safeEqual(signature, expectedSignature)) {
      return null;
    }

    try {
      const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as TokenPayload;

      return payload.exp > nowSeconds() ? payload : null;
    } catch {
      return null;
    }
  }

  private sign(input: string): string {
    return createHmac("sha256", this.jwtSecret).update(input).digest("base64url");
  }

  private sessionKey(sessionId: string): string {
    return `auth:session:${sessionId}`;
  }

  private blacklistKey(tokenId: string): string {
    return `auth:blacklist:${tokenId}`;
  }
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

function isTokenPayload(payload: TokenPayload | null): payload is TokenPayload {
  return Boolean(payload);
}
