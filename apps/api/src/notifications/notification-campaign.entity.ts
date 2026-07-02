import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type NotificationCampaignStatus = "SCHEDULED" | "DISPATCHING" | "SENT" | "FAILED";
export type NotificationCampaignTargetSegment =
  | "ALL_CUSTOMERS"
  | "ACTIVE_CUSTOMERS"
  | "CUSTOMERS_WITH_DEVICE_TOKEN";

@Entity({ name: "notification_campaigns" })
@Index("ix_notification_campaigns_scheduled_at", ["scheduledAt"])
export class NotificationCampaign {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "created_by_id", type: "uuid" })
  createdById!: string;

  @Column({ type: "varchar", length: 160 })
  title!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({ name: "target_segment", type: "varchar", length: 60 })
  targetSegment!: NotificationCampaignTargetSegment;

  @Column({ name: "deep_link", type: "varchar", length: 512, nullable: true })
  deepLink!: string | null;

  @Column({ name: "scheduled_at", type: "timestamptz" })
  scheduledAt!: Date;

  @Column({ type: "varchar", length: 40, default: "SCHEDULED" })
  status!: NotificationCampaignStatus;

  @Column({ name: "total_targeted", type: "integer", default: 0 })
  totalTargeted!: number;

  @Column({ name: "sent_count", type: "integer", default: 0 })
  sentCount!: number;

  @Column({ name: "failed_count", type: "integer", default: 0 })
  failedCount!: number;

  @Column({ name: "dispatched_at", type: "timestamptz", nullable: true })
  dispatchedAt!: Date | null;

  @Column({ name: "failure_reason", type: "text", nullable: true })
  failureReason!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
