import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "outlet_ratings" })
@Index("uq_outlet_ratings_user_outlet", ["outletId", "customerId"], { unique: true })
@Index("ix_outlet_ratings_outlet", ["outletId"])
export class OutletRating {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "outlet_id", type: "uuid" })
  outletId!: string;

  @Column({ name: "customer_id", type: "uuid" })
  customerId!: string;

  @Column({ type: "integer" })
  rating!: number;

  @Column({ type: "text", nullable: true })
  comment!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
