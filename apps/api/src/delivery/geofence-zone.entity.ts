import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "geofence_zones" })
export class GeofenceZone {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index("uq_geofence_zones_name", { unique: true })
  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "geometry", spatialFeatureType: "Polygon", srid: 4326 })
  polygon!: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
