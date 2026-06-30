import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Customer } from "../auth/customer.entity";
import { UserRole } from "../auth/user-role.enum";
import type { CreateNotificationDto, CreatePromoNotificationDto } from "./dto/notification.dto";
import { Notification } from "./notification.entity";
import { PUSH_SENDER, type PushSender } from "./push-sender";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    @InjectRepository(Customer)
    private readonly users: Repository<Customer>,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
  ) {}

  listMine(user: AuthenticatedUser): Promise<Notification[]> {
    return this.notifications.find({
      where: { recipientId: user.id, recipientRole: user.role },
      order: { createdAt: "DESC" },
    });
  }

  async create(user: AuthenticatedUser, input: CreateNotificationDto): Promise<Notification> {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only admins can create notifications");
    }

    return this.createAndPush(input);
  }

  async createAndPush(input: CreateNotificationDto): Promise<Notification> {
    const notification = await this.notifications.save(this.notifications.create(input));
    const recipient = await this.users.findOne({
      where: { id: input.recipientId, role: input.recipientRole },
      select: { id: true, fcmToken: true },
    });

    if (recipient?.fcmToken) {
      try {
        await this.pushSender.send({
          token: recipient.fcmToken,
          title: input.title,
          body: input.body,
          data: {
            notificationId: notification.id,
            type: notification.type,
          },
        });
      } catch (error) {
        this.logger.warn(
          `Push notification delivery failed: ${JSON.stringify({
            notificationId: notification.id,
            recipientId: input.recipientId,
            message: error instanceof Error ? error.message : "Unknown push error",
          })}`,
        );
      }
    }

    return notification;
  }

  async broadcastPromo(
    user: AuthenticatedUser,
    input: CreatePromoNotificationDto,
  ): Promise<{ sent: number }> {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only admins can create promo notifications");
    }

    const recipients = await this.users.find({
      where: { role: input.recipientRole },
      select: { id: true, role: true },
    });

    for (const recipient of recipients) {
      await this.createAndPush({
        recipientId: recipient.id,
        recipientRole: recipient.role,
        type: input.type,
        title: input.title,
        body: input.body,
      });
    }

    return { sent: recipients.length };
  }

  async registerDeviceToken(user: AuthenticatedUser, token: string): Promise<{ registered: true }> {
    await this.users.update({ id: user.id }, { fcmToken: token });

    return { registered: true };
  }

  async markRead(user: AuthenticatedUser, id: string): Promise<Notification> {
    const notification = await this.notifications.findOneBy({ id });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    if (notification.recipientId !== user.id || notification.recipientRole !== user.role) {
      throw new ForbiddenException("Cannot access another user's notification");
    }

    notification.isRead = true;

    return this.notifications.save(notification);
  }
}
