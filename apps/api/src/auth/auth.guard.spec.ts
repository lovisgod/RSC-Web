import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { AuthGuard } from "./auth.guard";

describe(AuthGuard.name, () => {
  it("rejects missing credentials with 401", async () => {
    const guard = new AuthGuard({ authenticateAccessToken: vi.fn() } as never);

    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects invalid presented tokens with 403", async () => {
    const guard = new AuthGuard({
      authenticateAccessToken: vi.fn().mockRejectedValue(new UnauthorizedException()),
    } as never);

    await expect(
      guard.canActivate(contextFor({ headers: { authorization: "Bearer expired.jwt" } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function contextFor(request: { headers: Record<string, string> }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}
