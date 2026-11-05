import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "rider_locations" })
@Index("ix_rider_locations_rider_recorded", ["riderId", "recordedAt"])
export class RiderLocation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "rider_id", type: "uuid" })
  riderId!: string;

  @Column({ name: "master_order_id", type: "uuid", nullable: true })
  masterOrderId!: string | null;

  @Column({ type: "geometry", spatialFeatureType: "Point", srid: 4326 })
  geom!: string;

  @CreateDateColumn({ name: "recorded_at", type: "timestamptz" })
  recordedAt!: Date;

  @Column({ name: "eta_minutes", type: "integer", nullable: true })
  etaMinutes!: number | null;

  @Column({ name: "distance_km", type: "double precision", nullable: true })
  distanceKm!: number | null;

  @Column({ name: "eta_provider", type: "varchar", length: 20, nullable: true })
  etaProvider!: "google" | "osrm" | null;
}
