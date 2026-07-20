import {
  BadRequestException,
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
import { LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";

import type { AuthenticatedUser } from "../auth/authenticated-user";
import { Customer } from "../auth/customer.entity";
import { EMAIL_SENDER, type EmailSender } from "../auth/email/email-sender";
import { CustomerStatus } from "../auth/customer-status.enum";
import { UserRole } from "../auth/user-role.enum";
import { PiiCryptoService } from "../common/security/pii-crypto.service";
import type { ApplicationConfig } from "../config/configuration";
import type {
  CreateNotificationCampaignDto,
  CreateNotificationDto,
  CreatePromoNotificationDto,
  TogglePromoActiveDto,
  UpdatePromoDto,
  UpdateNotificationPreferencesDto,
} from "./dto/notification.dto";
import { NotificationCampaign } from "./notification-campaign.entity";
import { Notification } from "./notification.entity";
import { Promo } from "./promo.entity";
import { PUSH_SENDER, type PushSender } from "./push-sender";

export interface NotificationPreferences {
  promotions: boolean;
  discounts: boolean;
  seasonalOffers: boolean;
  orderStatus: true;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  promotions: true,
  discounts: true,
  seasonalOffers: true,
  orderStatus: true,
};

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
    @InjectRepository(Promo)
    private readonly promos: Repository<Promo>,
    @InjectRepository(Customer)
    private readonly users: Repository<Customer>,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    private readonly piiCrypto: PiiCryptoService,
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
      select: { id: true, fcmToken: true, notificationPreferences: true },
    });

    if (recipient?.fcmToken && shouldDeliverByPreference(recipient, input.type)) {
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
      select: {
        id: true,
        role: true,
        name: true,
        emailEncrypted: true,
        notificationPreferences: true,
      },
    });
    const promo = await this.savePromoFromInput(input);

    for (const recipient of recipients) {
      await this.createAndPush({
        recipientId: recipient.id,
        recipientRole: recipient.role,
        type: input.type,
        title: input.title,
        body: input.body,
        data: {
          promo: true,
          promoId: promo.id,
          promoCode: promo.code,
          discountTarget: promo.discountTarget,
          discountPercent: promo.discountPercent,
          scope: promo.scope,
          ...(promo.outletId ? { outletId: promo.outletId } : {}),
          ...(input.deepLink ? { deepLink: input.deepLink } : {}),
        },
      });
      await this.sendMarketingEmail(recipient, {
        type: input.type,
        subject: input.title,
        title: input.title,
        body: input.body,
      });
    }

    return { sent: recipients.length };
  }

  async listPromos(user?: AuthenticatedUser | null): Promise<Promo[]> {
    if (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN) {
      return this.promos.find({ order: { createdAt: "DESC" }, take: 100 });
    }

    const now = new Date();
    return this.promos.find({
      where: {
        isActive: true,
        startsAt: LessThanOrEqual(now),
        endsAt: MoreThanOrEqual(now),
      },
      order: { endsAt: "ASC", createdAt: "DESC" },
      take: 100,
    });
  }

  async updatePromo(user: AuthenticatedUser, id: string, input: UpdatePromoDto): Promise<Promo> {
    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only admins can update promos");
    }

    const promo = await this.promos.findOneBy({ id });
    if (!promo) {
      throw new NotFoundException("Promo not found");
    }

    if (input.title !== undefined) promo.title = input.title;
    if (input.body !== undefined) promo.body = input.body;
    if (input.discountTarget !== undefined) promo.discountTarget = input.discountTarget;
    if (input.discountPercent !== undefined) promo.discountPercent = input.discountPercent;
    if (input.scope !== undefined) promo.scope = input.scope;
    if (input.outletId !== undefined) promo.outletId = input.outletId;
    if (input.startsAt !== undefined) promo.startsAt = new Date(input.startsAt);
    if (input.endsAt !== undefined) promo.endsAt = new Date(input.endsAt);
    if (input.isActive !== undefined) promo.isActive = input.isActive;
    if (input.deepLink !== undefined) promo.deepLink = input.deepLink;
    this.validatePromo(promo, { requireFutureStart: input.startsAt !== undefined });

    return this.promos.save(promo);
  }

  togglePromoActive(
    user: AuthenticatedUser,
    id: string,
    input: TogglePromoActiveDto,
  ): Promise<Promo> {
    return this.updatePromo(user, id, { isActive: input.isActive });
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
    await this.sendCampaignEmails(campaign);

    return campaign;
  }

  listCampaigns(): Promise<NotificationCampaign[]> {
    return this.campaigns.find({ order: { scheduledAt: "DESC", createdAt: "DESC" }, take: 100 });
  }

  private async savePromoFromInput(input: CreatePromoNotificationDto): Promise<Promo> {
    const promo = this.promos.create({
      code: input.promoCode.trim().toUpperCase(),
      title: input.title,
      body: input.body,
      discountTarget: input.discountTarget,
      discountPercent: input.discountPercent,
      scope: input.scope,
      outletId: input.scope === "OUTLET" ? (input.outletId ?? null) : null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      isActive: true,
      deepLink: input.deepLink ?? null,
    });
    this.validatePromo(promo, { requireFutureStart: true });

    return this.promos.save(promo);
  }

  private validatePromo(promo: Promo, options: { requireFutureStart?: boolean } = {}): void {
    if (promo.scope === "OUTLET" && !promo.outletId) {
      throw new BadRequestException("Outlet scoped promos require outletId");
    }
    if (promo.scope === "ALL_OUTLETS") {
      promo.outletId = null;
    }
    if (options.requireFutureStart && promo.startsAt < new Date()) {
      throw new BadRequestException("Promo startsAt must not be in the past");
    }
    if (promo.endsAt <= promo.startsAt) {
      throw new BadRequestException("Promo endsAt must be after startsAt");
    }
  }

  async registerDeviceToken(user: AuthenticatedUser, token: string): Promise<{ registered: true }> {
    await this.users.update({ id: user.id }, { fcmToken: token });

    return { registered: true };
  }

  async getPreferences(user: AuthenticatedUser): Promise<NotificationPreferences> {
    const account = await this.users.findOne({
      where: { id: user.id },
      select: { id: true, notificationPreferences: true },
    });

    if (!account) {
      throw new NotFoundException("User not found");
    }

    return normalizePreferences(account.notificationPreferences);
  }

  async updatePreferences(
    user: AuthenticatedUser,
    input: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferences> {
    const account = await this.users.findOne({
      where: { id: user.id },
      select: { id: true, notificationPreferences: true },
    });

    if (!account) {
      throw new NotFoundException("User not found");
    }

    const next = normalizePreferences({
      ...normalizePreferences(account.notificationPreferences),
      ...input,
      orderStatus: true,
    });

    account.notificationPreferences = next as unknown as Record<string, unknown>;
    await this.users.save(account);

    return next;
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
        if (!shouldDeliverByPreference(recipient, "CAMPAIGN")) {
          continue;
        }

        const notification = await this.notifications.save(
          this.notifications.create({
            recipientId: recipient.id,
            recipientRole: recipient.role,
            type: "CAMPAIGN",
            title: campaign.title,
            body: campaign.body,
            data: {
              ...(campaign.deepLink ? { deepLink: campaign.deepLink } : {}),
            },
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
      .select(["user.id", "user.role", "user.name", "user.emailEncrypted", "user.fcmToken"])
      .addSelect("user.notificationPreferences")
      .where("user.role = :role", { role: UserRole.CUSTOMER });

    if (campaign.targetSegment === "ACTIVE_CUSTOMERS") {
      query.andWhere("user.status = :status", { status: CustomerStatus.ACTIVE });
    }

    if (campaign.targetSegment === "CUSTOMERS_WITH_DEVICE_TOKEN") {
      query.andWhere("user.fcmToken IS NOT NULL");
    }

    return query.getMany();
  }

  private async sendCampaignEmails(campaign: NotificationCampaign): Promise<void> {
    const recipients = await this.resolveCampaignRecipients(campaign);

    await Promise.all(
      recipients.map((recipient) =>
        this.sendMarketingEmail(recipient, {
          type: "CAMPAIGN",
          subject: campaign.title,
          title: campaign.title,
          body: campaign.body,
        }),
      ),
    );
  }

  private async sendMarketingEmail(
    recipient: CampaignRecipient,
    input: { type: string; subject: string; title: string; body: string },
  ): Promise<void> {
    if (!shouldDeliverByPreference(recipient, input.type)) {
      return;
    }

    try {
      await this.emailSender.sendMarketing({
        email: this.piiCrypto.decrypt(recipient.emailEncrypted),
        name: recipient.name,
        subject: input.subject,
        title: input.title,
        body: input.body,
      });
    } catch (error) {
      this.logger.warn(
        `Marketing email delivery failed: ${JSON.stringify({
          recipientId: recipient.id,
          type: input.type,
          message: error instanceof Error ? error.message : "Unknown email error",
        })}`,
      );
    }
  }
}

function normalizePreferences(value: unknown): NotificationPreferences {
  const input =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

  return {
    promotions:
      typeof input.promotions === "boolean"
        ? input.promotions
        : DEFAULT_NOTIFICATION_PREFERENCES.promotions,
    discounts:
      typeof input.discounts === "boolean"
        ? input.discounts
        : DEFAULT_NOTIFICATION_PREFERENCES.discounts,
    seasonalOffers:
      typeof input.seasonalOffers === "boolean"
        ? input.seasonalOffers
        : DEFAULT_NOTIFICATION_PREFERENCES.seasonalOffers,
    orderStatus: true,
  };
}

function shouldDeliverByPreference(
  recipient: { notificationPreferences?: Record<string, unknown> | null },
  type: string,
): boolean {
  const preferences = normalizePreferences(recipient.notificationPreferences);
  const normalizedType = type.toUpperCase();

  if (
    normalizedType === "ORDER_STATUS" ||
    normalizedType === "ORDER_ASSIGNMENT" ||
    normalizedType === "PAYMENT_SUCCESS"
  ) {
    return true;
  }

  if (normalizedType.includes("DISCOUNT")) {
    return preferences.discounts;
  }

  if (normalizedType.includes("SEASON") || normalizedType === "CAMPAIGN") {
    return preferences.seasonalOffers;
  }

  if (normalizedType.includes("PROMO") || normalizedType.includes("SPECIAL")) {
    return preferences.promotions;
  }

  return preferences.promotions;
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
  name: string;
  role: UserRole;
  emailEncrypted: string;
  fcmToken: string | null;
  notificationPreferences?: Record<string, unknown> | null;
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
