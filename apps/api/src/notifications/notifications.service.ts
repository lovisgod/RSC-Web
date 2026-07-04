import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Customer } from "../auth/customer.entity";
import { CustomerStatus } from "../auth/customer-status.enum";
import { UserRole } from "../auth/user-role.enum";
import type { ApplicationConfig } from "../config/configuration";
import type {
  CreateNotificationCampaignDto,
  CreateNotificationDto,
  CreatePromoNotificationDto,
} from "./dto/notification.dto";
import { NotificationCampaign } from "./notification-campaign.entity";
import { Notification } from "./notification.entity";
import { PUSH_SENDER, type PushSender } from "./push-sender";

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly campaignQueue: Queue;
  private readonly campaignWorker: Worker;

  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    @InjectRepository(NotificationCampaign)
    private readonly campaigns: Repository<NotificationCampaign>,
    @InjectRepository(Customer)
    private readonly users: Repository<Customer>,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
    configService: ConfigService<ApplicationConfig, true>,
  ) {
    const connection = redisConnectionOptions(configService.get("redis.url", { infer: true }));

    this.campaignQueue = new Queue("notification-campaigns", {
      connection,
    });
    this.campaignWorker = new Worker(
      "notification-campaigns",
      async (job) => this.dispatchCampaign((job.data as NotificationCampaignJob).campaignId),
      { connection },
    );
    this.campaignWorker.on("failed", (job, error) => {
      const data = isNotificationCampaignJob(job?.data) ? job.data : null;

      this.logger.error(
        `Notification campaign job failed: ${JSON.stringify({
          campaignId: data?.campaignId ?? null,
          message: error.message,
        })}`,
      );
    });
  }

  async onModuleInit(): Promise<void> {
    const pending = await this.campaigns.find({
      where: { status: "SCHEDULED" },
      order: { scheduledAt: "ASC" },
    });

    await Promise.all(pending.map((campaign) => this.enqueueCampaign(campaign)));
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.campaignWorker.close(), this.campaignQueue.close()]);
  }

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
          data: stringifyPushData({
            ...(input.data ?? {}),
            notificationId: notification.id,
            type: notification.type,
          }),
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

  async scheduleCampaign(
    user: AuthenticatedUser,
    input: CreateNotificationCampaignDto,
  ): Promise<NotificationCampaign> {
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only super admins can schedule notification campaigns");
    }

    const campaign = await this.campaigns.save(
      this.campaigns.create({
        createdById: user.id,
        title: input.title,
        body: input.body,
        targetSegment: input.targetSegment,
        deepLink: input.deepLink ?? null,
        scheduledAt: new Date(input.scheduledAt),
        status: "SCHEDULED",
      }),
    );
    await this.enqueueCampaign(campaign);

    return campaign;
  }

  listCampaigns(): Promise<NotificationCampaign[]> {
    return this.campaigns.find({ order: { scheduledAt: "DESC", createdAt: "DESC" }, take: 100 });
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

  private async enqueueCampaign(campaign: NotificationCampaign): Promise<void> {
    const delay = Math.max(campaign.scheduledAt.getTime() - Date.now(), 0);

    await this.campaignQueue.add(
      "dispatch",
      { campaignId: campaign.id },
      {
        delay,
        jobId: campaign.id,
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: "exponential", delay: 30_000 },
      },
    );
  }

  private async dispatchCampaign(campaignId: string): Promise<void> {
    const campaign = await this.campaigns.findOneBy({ id: campaignId });

    if (!campaign || campaign.status === "SENT") {
      return;
    }

    campaign.status = "DISPATCHING";
    campaign.failureReason = null;
    await this.campaigns.save(campaign);

    try {
      const recipients = await this.resolveCampaignRecipients(campaign);
      let sentCount = 0;
      let failedCount = 0;

      for (const recipient of recipients) {
        const notification = await this.notifications.save(
          this.notifications.create({
            recipientId: recipient.id,
            recipientRole: recipient.role,
            type: "CAMPAIGN",
            title: campaign.title,
            body: campaign.body,
          }),
        );

        if (!recipient.fcmToken) {
          failedCount += 1;
          continue;
        }

        try {
          await this.pushSender.send({
            token: recipient.fcmToken,
            title: campaign.title,
            body: campaign.body,
            data: {
              notificationId: notification.id,
              type: notification.type,
              campaignId: campaign.id,
              ...(campaign.deepLink ? { deepLink: campaign.deepLink } : {}),
            },
          });
          sentCount += 1;
        } catch (error) {
          failedCount += 1;
          this.logger.warn(
            `Campaign push delivery failed: ${JSON.stringify({
              campaignId: campaign.id,
              recipientId: recipient.id,
              message: error instanceof Error ? error.message : "Unknown push error",
            })}`,
          );
        }
      }

      campaign.status = "SENT";
      campaign.totalTargeted = recipients.length;
      campaign.sentCount = sentCount;
      campaign.failedCount = failedCount;
      campaign.dispatchedAt = new Date();
      await this.campaigns.save(campaign);
    } catch (error) {
      campaign.status = "FAILED";
      campaign.failureReason = error instanceof Error ? error.message : "Unknown campaign error";
      await this.campaigns.save(campaign);
      throw error;
    }
  }

  private resolveCampaignRecipients(campaign: NotificationCampaign): Promise<CampaignRecipient[]> {
    const query = this.users
      .createQueryBuilder("user")
      .select(["user.id", "user.role", "user.fcmToken"])
      .where("user.role = :role", { role: UserRole.CUSTOMER });

    if (campaign.targetSegment === "ACTIVE_CUSTOMERS") {
      query.andWhere("user.status = :status", { status: CustomerStatus.ACTIVE });
    }

    if (campaign.targetSegment === "CUSTOMERS_WITH_DEVICE_TOKEN") {
      query.andWhere("user.fcmToken IS NOT NULL");
    }

    return query.getMany();
  }
}

function stringifyPushData(input: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    ]),
  );
}

interface NotificationCampaignJob {
  campaignId: string;
}

interface CampaignRecipient {
  id: string;
  role: UserRole;
  fcmToken: string | null;
}

function isNotificationCampaignJob(value: unknown): value is NotificationCampaignJob {
  return (
    typeof value === "object" &&
    value !== null &&
    "campaignId" in value &&
    typeof value.campaignId === "string"
  );
}

function redisConnectionOptions(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}
