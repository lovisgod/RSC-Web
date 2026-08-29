import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import {
  IsDateString,
  IsBoolean,
  IsInt,
  IsEnum,
  IsIn,
  IsOptional,
  IsObject,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import { UserRole } from "../../auth/user-role.enum";

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateNotificationDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  recipientId!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  recipientRole!: UserRole;

  @ApiProperty({ example: "ORDER_STATUS" })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  type!: string;

  @ApiProperty({ example: "Order accepted" })
  @Transform(trim)
  @IsString()
  @Length(2, 160)
  title!: string;

  @ApiProperty({ example: "Your order is being prepared." })
  @Transform(trim)
  @IsString()
  @Length(2, 2_000)
  body!: string;

  @ApiProperty({ example: { deepLink: "rsc://orders/order-id" }, required: false })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class RegisterDeviceTokenDto {
  @ApiProperty({ example: "fcm-token" })
  @IsString()
  @Length(10, 255)
  token!: string;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  promotions?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  discounts?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  seasonalOffers?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description: "Operational order-status notifications are always enabled by the API.",
  })
  @IsOptional()
  @IsBoolean()
  orderStatus?: boolean;
}

export class CreatePromoNotificationDto {
  @ApiProperty({ example: "SPECIAL_PERIOD" })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  type!: string;

  @ApiProperty({ example: "Weekend discount" })
  @Transform(trim)
  @IsString()
  @Length(2, 160)
  title!: string;

  @ApiProperty({ example: "Use code WEEKEND for a discount this weekend." })
  @Transform(trim)
  @IsString()
  @Length(2, 2_000)
  body!: string;

  @ApiProperty({ enum: ["CUSTOMER", "ADMIN", "RIDER"], example: "CUSTOMER" })
  @IsEnum(UserRole)
  recipientRole!: UserRole;

  @ApiProperty({ example: "WEEKEND", required: false })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  promoCode!: string;

  @ApiProperty({ enum: ["DELIVERY", "ORDER"], example: "DELIVERY" })
  @IsIn(["DELIVERY", "ORDER"])
  discountTarget!: "DELIVERY" | "ORDER";

  @ApiProperty({ example: 100, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent!: number;

  @ApiProperty({ enum: ["ALL_OUTLETS", "OUTLET"], example: "ALL_OUTLETS" })
  @IsIn(["ALL_OUTLETS", "OUTLET"])
  scope!: "ALL_OUTLETS" | "OUTLET";

  @ApiProperty({ format: "uuid", required: false })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiProperty({ example: "2026-07-14T00:00:00.000Z" })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: "2026-07-31T23:59:59.000Z" })
  @IsDateString()
  endsAt!: string;

  @ApiProperty({ example: "rsc://outlets/outlet-id", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  deepLink?: string;

  @ApiProperty({ example: "https://example.com/promo.jpg", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  imageUrl?: string;
}

export class UpdatePromoDto {
  @ApiProperty({ example: "Weekend discount", required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 160)
  title?: string;

  @ApiProperty({ example: "Use code WEEKEND for a discount this weekend.", required: false })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 2_000)
  body?: string;

  @ApiProperty({ enum: ["DELIVERY", "ORDER"], required: false })
  @IsOptional()
  @IsIn(["DELIVERY", "ORDER"])
  discountTarget?: "DELIVERY" | "ORDER";

  @ApiProperty({ example: 20, minimum: 1, maximum: 100, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent?: number;

  @ApiProperty({ enum: ["ALL_OUTLETS", "OUTLET"], required: false })
  @IsOptional()
  @IsIn(["ALL_OUTLETS", "OUTLET"])
  scope?: "ALL_OUTLETS" | "OUTLET";

  @ApiProperty({ format: "uuid", required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  outletId?: string | null;

  @ApiProperty({ example: "2026-07-14T00:00:00.000Z", required: false })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiProperty({ example: "2026-07-31T23:59:59.000Z", required: false })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: "rsc://outlets/outlet-id", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  deepLink?: string | null;

  @ApiProperty({ example: "https://example.com/promo.jpg", required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  imageUrl?: string | null;
}

export class TogglePromoActiveDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive!: boolean;
}

export class CreateNotificationCampaignDto {
  @ApiProperty({ example: "Weekend special" })
  @Transform(trim)
  @IsString()
  @Length(2, 160)
  title!: string;

  @ApiProperty({ example: "Use code WEEKEND for a seasonal discount." })
  @Transform(trim)
  @IsString()
  @Length(2, 2_000)
  body!: string;

  @ApiProperty({
    enum: ["ALL_CUSTOMERS", "ACTIVE_CUSTOMERS", "CUSTOMERS_WITH_DEVICE_TOKEN"],
    example: "ACTIVE_CUSTOMERS",
  })
  @IsIn(["ALL_CUSTOMERS", "ACTIVE_CUSTOMERS", "CUSTOMERS_WITH_DEVICE_TOKEN"])
  targetSegment!: "ALL_CUSTOMERS" | "ACTIVE_CUSTOMERS" | "CUSTOMERS_WITH_DEVICE_TOKEN";

  @ApiProperty({ example: "2026-07-01T10:00:00.000Z" })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ example: "rsc://promos/weekend", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  deepLink?: string;
}
