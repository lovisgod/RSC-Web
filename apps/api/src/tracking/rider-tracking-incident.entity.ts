import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type RiderTrackingIncidentStatus = "STALE" | "OFFLINE" | "RESOLVED";

@Entity({ name: "rider_tracking_incidents" })
@Index("uq_rider_tracking_incidents_order", ["masterOrderId"], { unique: true })
export class RiderTrackingIncident {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "master_order_id", type: "uuid" })
  masterOrderId!: string;

  @Column({ name: "rider_id", type: "uuid" })
  riderId!: string;

  @Column({ type: "varchar", length: 20 })
  status!: RiderTrackingIncidentStatus;

  @Column({ name: "last_seen_at", type: "timestamptz", nullable: true })
  lastSeenAt!: Date | null;

  @Column({ name: "stale_at", type: "timestamptz", nullable: true })
  staleAt!: Date | null;

  @Column({ name: "offline_at", type: "timestamptz", nullable: true })
  offlineAt!: Date | null;

  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
