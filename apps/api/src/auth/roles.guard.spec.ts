import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import { RolesGuard } from "./roles.guard";
import { UserRole } from "./user-role.enum";

describe(RolesGuard.name, () => {
  it("rejects users without a required role with 403", () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([UserRole.ADMIN]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(() =>
      guard.canActivate(
        contextFor({
          user: {
            id: "2abf9577-027c-4936-83a8-e004fd56a46e",
            role: UserRole.CUSTOMER,
            sessionId: "session",
            accessTokenId: "token",
          },
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});

function contextFor(request: unknown): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}
