import type { Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Customer } from "../auth/customer.entity";
import { UserRole } from "../auth/user-role.enum";
import { NotificationCampaign } from "./notification-campaign.entity";
import { Notification } from "./notification.entity";
import { NotificationsService } from "./notifications.service";
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
  let users: {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let sendPush: ReturnType<typeof vi.fn<PushSender["send"]>>;
  let pushSender: PushSender;
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
    service = new NotificationsService(
      notifications as unknown as Repository<Notification>,
      campaigns as unknown as Repository<NotificationCampaign>,
      users as unknown as Repository<Customer>,
      pushSender,
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
});
