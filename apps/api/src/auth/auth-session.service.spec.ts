import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ApplicationConfig } from "../config/configuration";
import { AuthSessionService } from "./auth-session.service";
import { Customer } from "./customer.entity";
import { UserRole } from "./user-role.enum";

describe(AuthSessionService.name, () => {
  let redis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    values: Map<string, string>;
  };
  let service: AuthSessionService;

  beforeEach(() => {
    redis = {
      values: new Map<string, string>(),
      get: vi.fn((key: string) => Promise.resolve(redis.values.get(key) ?? null)),
      set: vi.fn((key: string, value: string) => {
        redis.values.set(key, value);
        return Promise.resolve("OK");
      }),
      exists: vi.fn((key: string) => Promise.resolve(redis.values.has(key) ? 1 : 0)),
      del: vi.fn((key: string) => {
        redis.values.delete(key);
        return Promise.resolve(1);
      }),
    };

    service = new AuthSessionService(
      redis as never,
      {
        get: () => ({
          jwtSecret: "x".repeat(32),
          accessTokenTtlSeconds: 900,
          refreshTokenTtlSeconds: 604800,
          adminInactivityTimeoutSeconds: 1800,
        }),
      } as unknown as ConfigService<ApplicationConfig, true>,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("authenticates an issued access token", async () => {
    const user = Object.assign(new Customer(), {
      id: "2abf9577-027c-4936-83a8-e004fd56a46e",
      role: UserRole.CUSTOMER,
    });

    const session = await service.issueSession(user);
    const authenticated = await service.authenticateAccessToken(session.accessToken);

    expect(authenticated).toMatchObject({
      id: user.id,
      role: UserRole.CUSTOMER,
    });
  });

  it("includes outlet id in issued outlet admin login responses", async () => {
    const user = Object.assign(new Customer(), {
      id: "2abf9577-027c-4936-83a8-e004fd56a46e",
      role: UserRole.ADMIN,
      outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
    });

    const session = await service.issueSession(user);

    expect(session.user).toEqual({
      id: user.id,
      role: UserRole.ADMIN,
      outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
    });
  });

  it("blacklists tokens and removes the session on logout", async () => {
    const user = Object.assign(new Customer(), {
      id: "2abf9577-027c-4936-83a8-e004fd56a46e",
      role: UserRole.CUSTOMER,
    });
    const session = await service.issueSession(user);

    await service.revokeSession(session.accessToken, session.refreshToken);

    await expect(service.authenticateAccessToken(session.accessToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("expires admin sessions after 30 minutes of inactivity", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-25T10:00:00.000Z"));
    const user = Object.assign(new Customer(), {
      id: "2abf9577-027c-4936-83a8-e004fd56a46e",
      role: UserRole.ADMIN,
    });
    const session = await service.issueSession(user);

    vi.setSystemTime(new Date("2026-06-25T10:31:00.000Z"));

    await expect(service.authenticateAccessToken(session.accessToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
