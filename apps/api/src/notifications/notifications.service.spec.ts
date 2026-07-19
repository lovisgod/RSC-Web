import type { FindManyOptions, Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Customer } from "../auth/customer.entity";
import type { EmailSender } from "../auth/email/email-sender";
import { UserRole } from "../auth/user-role.enum";
import { NotificationCampaign } from "./notification-campaign.entity";
import { Notification } from "./notification.entity";
import { NotificationsService } from "./notifications.service";
import { Promo } from "./promo.entity";
import type { PushSender } from "./push-sender";

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(function Queue() {
    return {
      add: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
  }),
  Worker: vi.fn().mockImplementation(function Worker() {
    return {
      close: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
    };
  }),
}));

describe(NotificationsService.name, () => {
  const recipientId = "2abf9577-027c-4936-83a8-e004fd56a46e";
  let notifications: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
  };
  let campaigns: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
  };
  let promos: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
  };
  let users: {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let sendPush: ReturnType<typeof vi.fn<PushSender["send"]>>;
  let pushSender: PushSender;
  let sendMarketingEmail: ReturnType<typeof vi.fn<EmailSender["sendMarketing"]>>;
  let emailSender: EmailSender;
  let piiCrypto: { decrypt: ReturnType<typeof vi.fn> };
  let service: NotificationsService;

  beforeEach(() => {
    notifications = {
      create: vi.fn((input: Partial<Notification>) =>
        Object.assign(new Notification(), {
          id: "45ef3252-b96f-4308-b40e-391623b25ac9",
          ...input,
        }),
      ),
      save: vi.fn((notification: Notification) => Promise.resolve(notification)),
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue(null),
    };
    campaigns = {
      create: vi.fn((input: Partial<NotificationCampaign>) =>
        Object.assign(new NotificationCampaign(), {
          id: "f585b919-3204-4fc8-9d48-1703ab296888",
          ...input,
        }),
      ),
      save: vi.fn((campaign: NotificationCampaign) => Promise.resolve(campaign)),
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue(null),
    };
    promos = {
      create: vi.fn((input: Partial<Promo>) =>
        Object.assign(new Promo(), {
          id: "9d353d54-7254-4538-9487-c21ab15b833e",
          ...input,
        }),
      ),
      save: vi.fn((promo: Promo) => Promise.resolve(promo)),
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockResolvedValue(null),
    };
    users = {
      findOne: vi.fn().mockResolvedValue(
        Object.assign(new Customer(), {
          id: recipientId,
          role: UserRole.CUSTOMER,
          fcmToken: "valid-looking-fcm-token",
        }),
      ),
      find: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(undefined),
    };
    sendPush = vi.fn<PushSender["send"]>().mockResolvedValue(undefined);
    pushSender = { send: (input) => sendPush(input) };
    sendMarketingEmail = vi.fn<EmailSender["sendMarketing"]>().mockResolvedValue(undefined);
    emailSender = {
      sendWelcomeVerification: vi.fn<EmailSender["sendWelcomeVerification"]>(),
      sendPasswordReset: vi.fn<EmailSender["sendPasswordReset"]>(),
      sendTemporaryPassword: vi.fn<EmailSender["sendTemporaryPassword"]>(),
      sendMarketing: (input) => sendMarketingEmail(input),
    };
    piiCrypto = {
      decrypt: vi.fn((value: string) => `${value}@example.com`),
    };
    service = new NotificationsService(
      notifications as unknown as Repository<Notification>,
      campaigns as unknown as Repository<NotificationCampaign>,
      promos as unknown as Repository<Promo>,
      users as unknown as Repository<Customer>,
      pushSender,
      emailSender,
      piiCrypto as never,
      { get: vi.fn().mockReturnValue("redis://localhost:6379") } as never,
    );
  });

  it("persists and sends push notifications when a recipient has a device token", async () => {
    const notification = await service.createAndPush({
      recipientId,
      recipientRole: UserRole.CUSTOMER,
      type: "ORDER_STATUS",
      title: "Order status updated",
      body: "Your order is ready.",
    });

    expect(notification.id).toBe("45ef3252-b96f-4308-b40e-391623b25ac9");
    expect(sendPush).toHaveBeenCalledWith({
      token: "valid-looking-fcm-token",
      title: "Order status updated",
      body: "Your order is ready.",
      data: {
        notificationId: notification.id,
        type: "ORDER_STATUS",
      },
    });
  });

  it("does not fail notification creation when push delivery fails", async () => {
    sendPush.mockRejectedValueOnce(new Error("Firebase rejected token"));

    await expect(
      service.createAndPush({
        recipientId,
        recipientRole: UserRole.CUSTOMER,
        type: "ORDER_STATUS",
        title: "Order status updated",
        body: "Your order is ready.",
      }),
    ).resolves.toMatchObject({
      id: "45ef3252-b96f-4308-b40e-391623b25ac9",
      recipientId,
    });

    expect(notifications.save).toHaveBeenCalledOnce();
  });

  it("broadcasts promo notifications to matching recipients so customer GET has data", async () => {
    const secondRecipientId = "41e98748-bc19-44e9-b070-178b3a126efb";
    users.find.mockResolvedValueOnce([
      Object.assign(new Customer(), {
        id: recipientId,
        name: "First Customer",
        role: UserRole.CUSTOMER,
        emailEncrypted: "first",
      }),
      Object.assign(new Customer(), {
        id: secondRecipientId,
        name: "Second Customer",
        role: UserRole.CUSTOMER,
        emailEncrypted: "second",
      }),
    ]);
    users.findOne
      .mockResolvedValueOnce(
        Object.assign(new Customer(), {
          id: recipientId,
          role: UserRole.CUSTOMER,
          fcmToken: "first-fcm-token",
        }),
      )
      .mockResolvedValueOnce(
        Object.assign(new Customer(), {
          id: secondRecipientId,
          role: UserRole.CUSTOMER,
          fcmToken: null,
        }),
      );

    await expect(
      service.broadcastPromo(
        {
          id: "31a2df7e-7f2a-4433-9d5e-1caad0f91c4d",
          role: UserRole.ADMIN,
          sessionId: "session-1",
          accessTokenId: "access-token-1",
        },
        {
          recipientRole: UserRole.CUSTOMER,
          type: "PROMO",
          title: "Weekend discount",
          body: "Use code WEEKEND for a discount this weekend.",
          promoCode: "WEEKEND",
          discountTarget: "DELIVERY",
          discountPercent: 100,
          scope: "ALL_OUTLETS",
          startsAt: "2099-07-14T00:00:00.000Z",
          endsAt: "2099-07-31T23:59:59.000Z",
        },
      ),
    ).resolves.toEqual({ sent: 2 });

    expect(promos.save).toHaveBeenCalledWith(
      expect.objectContaining({ code: "WEEKEND", discountTarget: "DELIVERY" }),
    );
    expect(notifications.save).toHaveBeenCalledTimes(2);
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId,
        recipientRole: UserRole.CUSTOMER,
        type: "PROMO",
        title: "Weekend discount",
      }),
    );
    const createdNotification = notifications.create.mock.calls[0]?.[0] as
      | Partial<Notification>
      | undefined;
    expect(createdNotification?.data).toEqual(expect.objectContaining({ promo: true }));
    expect(sendMarketingEmail).toHaveBeenCalledTimes(2);
    expect(sendMarketingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "first@example.com",
        name: "First Customer",
        subject: "Weekend discount",
      }),
    );
  });

  it("rejects promo creation when startsAt is in the past", async () => {
    await expect(
      service.broadcastPromo(
        {
          id: "31a2df7e-7f2a-4433-9d5e-1caad0f91c4d",
          role: UserRole.ADMIN,
          sessionId: "session-1",
          accessTokenId: "access-token-1",
        },
        {
          recipientRole: UserRole.CUSTOMER,
          type: "PROMO",
          title: "Expired setup",
          body: "This should not be accepted.",
          promoCode: "OLD50",
          discountTarget: "ORDER",
          discountPercent: 50,
          scope: "ALL_OUTLETS",
          startsAt: new Date(Date.now() - 86_400_000).toISOString(),
          endsAt: new Date(Date.now() + 86_400_000).toISOString(),
        },
      ),
    ).rejects.toThrow(/startsAt/);

    expect(promos.save).not.toHaveBeenCalled();
  });

  it("lists recent promo notifications for admins", async () => {
    const savedPromo = Object.assign(new Promo(), {
      id: "9d353d54-7254-4538-9487-c21ab15b833e",
      code: "WEEKEND",
      title: "Weekend discount",
      body: "Use code WEEKEND for a discount this weekend.",
      discountTarget: "DELIVERY",
      discountPercent: 100,
      scope: "ALL_OUTLETS",
      outletId: null,
      startsAt: new Date("2099-07-14T00:00:00.000Z"),
      endsAt: new Date("2099-07-31T23:59:59.000Z"),
      isActive: true,
    });
    promos.find.mockResolvedValueOnce([savedPromo]);

    await expect(
      service.listPromos({
        id: "31a2df7e-7f2a-4433-9d5e-1caad0f91c4d",
        role: UserRole.ADMIN,
        sessionId: "session-1",
        accessTokenId: "access-token-1",
      }),
    ).resolves.toEqual([savedPromo]);

    expect(promos.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { createdAt: "DESC" },
        take: 100,
      }),
    );
  });

  it("lists only active current promos for anonymous callers", async () => {
    const savedPromo = Object.assign(new Promo(), {
      id: "9d353d54-7254-4538-9487-c21ab15b833e",
      code: "WEEKEND",
      title: "Weekend discount",
      body: "Use code WEEKEND for a discount this weekend.",
      discountTarget: "DELIVERY",
      discountPercent: 100,
      scope: "ALL_OUTLETS",
      outletId: null,
      startsAt: new Date("2026-07-14T00:00:00.000Z"),
      endsAt: new Date("2099-07-31T23:59:59.000Z"),
      isActive: true,
    });
    promos.find.mockResolvedValueOnce([savedPromo]);

    await expect(service.listPromos()).resolves.toEqual([savedPromo]);

    const findOptions = promos.find.mock.calls.at(-1)?.[0] as FindManyOptions<Promo>;
    expect(findOptions.where).toEqual(expect.objectContaining({ isActive: true }));
    expect(findOptions.order).toEqual({ endsAt: "ASC", createdAt: "DESC" });
    expect(findOptions.take).toBe(100);
  });

  it("lists notifications for the authenticated recipient only", async () => {
    const savedNotification = Object.assign(new Notification(), {
      id: "45ef3252-b96f-4308-b40e-391623b25ac9",
      recipientId,
      recipientRole: UserRole.CUSTOMER,
      type: "PROMO",
      title: "Weekend discount",
      body: "Use code WEEKEND for a discount this weekend.",
      isRead: false,
    });
    notifications.find.mockResolvedValueOnce([savedNotification]);

    await expect(
      service.listMine({
        id: recipientId,
        role: UserRole.CUSTOMER,
        sessionId: "session-1",
        accessTokenId: "access-token-1",
      }),
    ).resolves.toEqual([savedNotification]);

    expect(notifications.find).toHaveBeenCalledWith({
      where: { recipientId, recipientRole: UserRole.CUSTOMER },
      order: { createdAt: "DESC" },
    });
  });
});
