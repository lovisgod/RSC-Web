import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { DataSource, Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Customer } from "../auth/customer.entity";
import { CustomerStatus } from "../auth/customer-status.enum";
import { UserRole } from "../auth/user-role.enum";
import type { OrdersService } from "../orders/orders.service";
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
  let dataSource: { query: ReturnType<typeof vi.fn> };
  let realtime: {
    emitRiderLocationUpdate: ReturnType<typeof vi.fn>;
    emitRiderAvailabilityUpdate: ReturnType<typeof vi.fn>;
  };
  let orders: { assignOldestReadyOrderToRider: ReturnType<typeof vi.fn> };
  let service: RidersService;

  beforeEach(() => {
    users = {
      findOne: vi.fn().mockResolvedValue(
        Object.assign(new Customer(), {
          id: riderUser.id,
          outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
          role: UserRole.RIDER,
          status: CustomerStatus.ACTIVE,
          riderStatus: "UNAVAILABLE",
          updatedAt: new Date("2026-07-16T12:00:00.000Z"),
        }),
      ),
      save: vi.fn((rider: Customer) => Promise.resolve(rider)),
    };
    dataSource = { query: vi.fn() };
    realtime = {
      emitRiderLocationUpdate: vi.fn(),
      emitRiderAvailabilityUpdate: vi.fn(),
    };
    orders = {
      assignOldestReadyOrderToRider: vi.fn().mockResolvedValue(null),
    };

    service = new RidersService(
      users as unknown as Repository<Customer>,
      {} as Repository<RiderLocation>,
      dataSource as unknown as DataSource,
      realtime as unknown as RealtimeService,
      orders as unknown as OrdersService,
    );
  });

  it("attaches the active out-for-delivery order when the rider location omits masterOrderId", async () => {
    const masterOrderId = "4c14d989-9057-4380-a2ad-63a8a4ec7abf";
    const recordedAt = new Date("2026-07-16T12:03:00.000Z");
    dataSource.query
      .mockResolvedValueOnce([{ id: masterOrderId }])
      .mockResolvedValueOnce([{ riderId: riderUser.id }])
      .mockResolvedValueOnce([
        {
          id: "84e0477e-45b2-43d4-a186-5b4d089f6b36",
          riderId: riderUser.id,
          masterOrderId,
          geom: "POINT(3.3552573 6.6137385)",
          recordedAt,
        },
      ]);

    await expect(
      service.recordLocation(riderUser, { latitude: 6.6137385, longitude: 3.3552573 }),
    ).resolves.toMatchObject({ riderId: riderUser.id, masterOrderId });

    expect(dataSource.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("INSERT INTO rider_locations"),
      [riderUser.id, masterOrderId, 3.3552573, 6.6137385],
    );
    expect(realtime.emitRiderLocationUpdate).toHaveBeenCalledWith({
      riderId: riderUser.id,
      masterOrderId,
      latitude: 6.6137385,
      longitude: 3.3552573,
      recordedAt,
    });
  });

  it("keeps general rider location updates unbound when no active delivery exists", async () => {
    const recordedAt = new Date("2026-07-16T12:03:00.000Z");
    dataSource.query.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: "84e0477e-45b2-43d4-a186-5b4d089f6b36",
        riderId: riderUser.id,
        masterOrderId: null,
        geom: "POINT(3.3552573 6.6137385)",
        recordedAt,
      },
    ]);

    await expect(
      service.recordLocation(riderUser, { latitude: 6.6137385, longitude: 3.3552573 }),
    ).resolves.toMatchObject({ riderId: riderUser.id, masterOrderId: null });

    expect(dataSource.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO rider_locations"),
      [riderUser.id, null, 3.3552573, 6.6137385],
    );
    expect(realtime.emitRiderLocationUpdate).toHaveBeenCalledWith({
      riderId: riderUser.id,
      masterOrderId: null,
      latitude: 6.6137385,
      longitude: 3.3552573,
      recordedAt,
    });
  });

  it("sets an active rider available for assignments", async () => {
    await expect(service.updateAvailability(riderUser, { isAvailable: true })).resolves.toEqual({
      id: riderUser.id,
      outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
      riderStatus: "AVAILABLE",
      isAvailable: true,
    });
    expect(users.save).toHaveBeenCalledWith(expect.objectContaining({ riderStatus: "AVAILABLE" }));
    expect(orders.assignOldestReadyOrderToRider).toHaveBeenCalledWith(
      expect.objectContaining({
        id: riderUser.id,
        role: UserRole.RIDER,
        outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
      }),
    );
  });

  it("sets an active rider unavailable for assignments", async () => {
    await expect(service.updateAvailability(riderUser, { isAvailable: false })).resolves.toEqual({
      id: riderUser.id,
      outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
      riderStatus: "UNAVAILABLE",
      isAvailable: false,
    });
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({ riderStatus: "UNAVAILABLE" }),
    );
    expect(orders.assignOldestReadyOrderToRider).not.toHaveBeenCalled();
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
