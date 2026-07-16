import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { DataSource, Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Customer } from "../auth/customer.entity";
import { CustomerStatus } from "../auth/customer-status.enum";
import { UserRole } from "../auth/user-role.enum";
import type { RealtimeService } from "../realtime/realtime.service";
import type { RiderLocation } from "./rider-location.entity";
import { RidersService } from "./riders.service";

describe(RidersService.name, () => {
  const riderUser: AuthenticatedUser = {
    id: "e965af29-38a2-4b41-874e-5d04726b2b05",
    role: UserRole.RIDER,
    sessionId: "session-id",
    accessTokenId: "access-token-id",
  };
  let users: {
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let service: RidersService;

  beforeEach(() => {
    users = {
      findOne: vi.fn().mockResolvedValue(
        Object.assign(new Customer(), {
          id: riderUser.id,
          role: UserRole.RIDER,
          status: CustomerStatus.ACTIVE,
          riderStatus: "UNAVAILABLE",
        }),
      ),
      save: vi.fn((rider: Customer) => Promise.resolve(rider)),
    };

    service = new RidersService(
      users as unknown as Repository<Customer>,
      {} as Repository<RiderLocation>,
      { query: vi.fn() } as unknown as DataSource,
      { emitRiderLocationUpdate: vi.fn() } as unknown as RealtimeService,
    );
  });

  it("sets an active rider available for assignments", async () => {
    await expect(service.updateAvailability(riderUser, { isAvailable: true })).resolves.toEqual({
      id: riderUser.id,
      riderStatus: "AVAILABLE",
      isAvailable: true,
    });
    expect(users.save).toHaveBeenCalledWith(expect.objectContaining({ riderStatus: "AVAILABLE" }));
  });

  it("sets an active rider unavailable for assignments", async () => {
    await expect(service.updateAvailability(riderUser, { isAvailable: false })).resolves.toEqual({
      id: riderUser.id,
      riderStatus: "UNAVAILABLE",
      isAvailable: false,
    });
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({ riderStatus: "UNAVAILABLE" }),
    );
  });

  it("rejects non-rider users", async () => {
    await expect(
      service.updateAvailability({ ...riderUser, role: UserRole.CUSTOMER }, { isAvailable: true }),
    ).rejects.toThrow(ForbiddenException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it("rejects inactive rider accounts", async () => {
    users.findOne.mockResolvedValue(
      Object.assign(new Customer(), {
        id: riderUser.id,
        role: UserRole.RIDER,
        status: CustomerStatus.SUSPENDED,
        riderStatus: "AVAILABLE",
      }),
    );

    await expect(service.updateAvailability(riderUser, { isAvailable: false })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(users.save).not.toHaveBeenCalled();
  });
});
