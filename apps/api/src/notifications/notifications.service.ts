import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { UserRole } from "../auth/user-role.enum";
import type { CreateNotificationDto } from "./dto/notification.dto";
import { Notification } from "./notification.entity";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
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

    return this.notifications.save(this.notifications.create(input));
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
