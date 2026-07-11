import type { Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PiiCryptoService } from "../common/security/pii-crypto.service";
import { Customer } from "../auth/customer.entity";
import { CustomerStatus } from "../auth/customer-status.enum";
import { UserRole } from "../auth/user-role.enum";
import type { EmailSender } from "../auth/email/email-sender";
import type { PhoneOtpService } from "../auth/otp/phone-otp.service";
import type { SmsSender } from "../auth/sms/sms-sender";
import type { MediaService } from "../media/media.service";
import { UsersService } from "./users.service";

describe(UsersService.name, () => {
  const superAdmin = {
    id: "31a2df7e-7f2a-4433-9d5e-1caad0f91c4d",
    role: UserRole.SUPER_ADMIN,
    sessionId: "session-1",
    accessTokenId: "access-token-1",
  };
  const admin = Object.assign(new Customer(), {
    id: "b709c9f9-7d01-4d84-90d6-50b0ad470bc5",
    name: "Outlet Manager",
    role: UserRole.ADMIN,
    outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
    avatarUrl: "https://cdn.example.com/avatar.png",
    emailEncrypted: "encrypted:manager@example.com",
    phoneEncrypted: "encrypted:+2348031234567",
    status: CustomerStatus.ACTIVE,
    createdAt: new Date("2026-07-02T08:00:00.000Z"),
    updatedAt: new Date("2026-07-02T09:00:00.000Z"),
  });
  let users: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    softRemove: ReturnType<typeof vi.fn>;
  };
  let service: UsersService;

  beforeEach(() => {
    users = {
      find: vi.fn().mockResolvedValue([admin]),
      findOneBy: vi.fn().mockResolvedValue(admin),
      softRemove: vi.fn().mockResolvedValue(admin),
    };
    const piiCrypto = {
      decrypt: vi.fn((value: string) => value.replace(/^encrypted:/, "")),
    };

    service = new UsersService(
      users as unknown as Repository<Customer>,
      piiCrypto as unknown as PiiCryptoService,
      {} as PhoneOtpService,
      {} as SmsSender,
      {} as EmailSender,
      {} as MediaService,
    );
  });

  it("lists active outlet admins for super admins", async () => {
    await expect(service.listOutletAdmins(superAdmin)).resolves.toEqual([
      {
        id: admin.id,
        name: "Outlet Manager",
        role: UserRole.ADMIN,
        outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
        email: "manager@example.com",
        phone: "+2348031234567",
        status: CustomerStatus.ACTIVE,
        createdAt: "2026-07-02T08:00:00.000Z",
        updatedAt: "2026-07-02T09:00:00.000Z",
      },
    ]);

    expect(users.find).toHaveBeenCalledWith({
      where: { role: UserRole.ADMIN },
      order: { createdAt: "DESC" },
    });
  });

  it("returns the uploaded avatar URL on the active user's profile", async () => {
    await expect(
      service.getProfile({
        id: admin.id,
        role: UserRole.ADMIN,
        sessionId: "session-1",
        accessTokenId: "access-token-1",
      }),
    ).resolves.toMatchObject({
      id: admin.id,
      avatarUrl: "https://cdn.example.com/avatar.png",
      email: "manager@example.com",
      phone: "+2348031234567",
    });
  });

  it("soft-deletes outlet admins through the role-specific path", async () => {
    await expect(service.deleteOutletAdmin(superAdmin, admin.id)).resolves.toEqual({
      deleted: true,
    });

    expect(users.findOneBy).toHaveBeenCalledWith({ id: admin.id, role: UserRole.ADMIN });
    expect(users.softRemove).toHaveBeenCalledWith(admin);
  });

  describe("rider management", () => {
    const rider = Object.assign(new Customer(), {
      id: "721da55a-e320-410e-a22a-f88fb66d6d45",
      name: "Rider Joe",
      role: UserRole.RIDER,
      outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
      emailEncrypted: "encrypted:joe@example.com",
      phoneEncrypted: "encrypted:+2348033333333",
      status: CustomerStatus.ACTIVE,
      createdAt: new Date("2026-07-02T08:00:00.000Z"),
      updatedAt: new Date("2026-07-02T09:00:00.000Z"),
    });

    it("lists active riders", async () => {
      users.find.mockResolvedValue([rider]);
      await expect(service.listRiders(superAdmin)).resolves.toEqual([
        {
          id: rider.id,
          name: "Rider Joe",
          role: UserRole.RIDER,
          outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
          email: "joe@example.com",
          phone: "+2348033333333",
          vehicleType: undefined,
          plateNumber: undefined,
          riderStatus: undefined,
          status: CustomerStatus.ACTIVE,
          createdAt: "2026-07-02T08:00:00.000Z",
          updatedAt: "2026-07-02T09:00:00.000Z",
        },
      ]);
    });

    it("soft-deletes riders through deleteRider path", async () => {
      users.findOneBy.mockResolvedValue(rider);
      await expect(service.deleteRider(superAdmin, rider.id)).resolves.toEqual({
        deleted: true,
      });

      expect(users.findOneBy).toHaveBeenCalledWith({ id: rider.id, role: UserRole.RIDER });
      expect(users.softRemove).toHaveBeenCalledWith(rider);
    });
  });
});
