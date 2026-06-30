import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  MaxLength,
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
}

export class RegisterDeviceTokenDto {
  @ApiProperty({ example: "fcm-token" })
  @IsString()
  @Length(10, 255)
  token!: string;
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
  @IsOptional()
  @IsString()
  @MaxLength(80)
  promoCode?: string;
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
