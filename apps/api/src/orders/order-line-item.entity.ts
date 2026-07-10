import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "order_line_items" })
@Index("ix_order_line_items_master", ["masterOrderId"])
@Index("ix_order_line_items_sub_order", ["subOrderId"])
export class OrderLineItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "master_order_id", type: "uuid" })
  masterOrderId!: string;

  @Column({ name: "sub_order_id", type: "uuid" })
  subOrderId!: string;

  @Column({ name: "outlet_id", type: "uuid" })
  outletId!: string;

  @Column({ name: "menu_item_id", type: "uuid", nullable: true })
  menuItemId!: string | null;

  @Column({ name: "item_name_snapshot", type: "varchar", length: 160 })
  itemNameSnapshot!: string;

  @Column({ name: "unit_price_minor", type: "integer" })
  unitPriceMinor!: number;

  @Column({ type: "integer" })
  quantity!: number;

  @Column({ name: "line_total_minor", type: "integer" })
  lineTotalMinor!: number;

  @Column({ type: "char", length: 3, default: "NGN" })
  currency!: "NGN";

  @Column({ name: "modifiers_snapshot", type: "jsonb", default: () => "'[]'::jsonb" })
  modifiersSnapshot!: unknown[];

  @Column({ name: "customer_note", type: "varchar", length: 500, nullable: true })
  customerNote!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt!: Date | null;
}
