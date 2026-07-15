import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import { MasterOrderStatus, SubOrderStatus } from "../order-status.enum";

export class ListAdminOrdersQueryDto {
  @ApiPropertyOptional({
    format: "uuid",
    description:
      "Filter orders that include this outlet. Super admins may use any outlet; outlet admins may only use their own outlet.",
  })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({
    enum: MasterOrderStatus,
    description: "Filter by the overall order status.",
  })
  @IsOptional()
  @IsEnum(MasterOrderStatus)
  status?: MasterOrderStatus;

  @ApiPropertyOptional({
    enum: SubOrderStatus,
    description: "Filter by the outlet-level sub-order status.",
  })
  @IsOptional()
  @IsEnum(SubOrderStatus)
  subOrderStatus?: SubOrderStatus;

  @ApiPropertyOptional({
    enum: ["DELIVERY", "TAKEOUT"],
    description: "Filter by delivery mode.",
  })
  @IsOptional()
  @IsIn(["DELIVERY", "TAKEOUT"])
  deliveryMode?: "DELIVERY" | "TAKEOUT";

  @ApiPropertyOptional({ format: "uuid", description: "Filter orders placed by one customer." })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    format: "date-time",
    description: "Return orders created at or after this ISO timestamp.",
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    format: "date-time",
    description: "Return orders created at or before this ISO timestamp.",
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class ListCustomerOrdersQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: MasterOrderStatus, example: MasterOrderStatus.OUT_FOR_DELIVERY })
  @IsEnum(MasterOrderStatus)
  status!: MasterOrderStatus;

  @ApiPropertyOptional({ example: "Rider assigned" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ example: 30, description: "Estimated preparation time in minutes" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(480)
  preparationTime?: number;

  @ApiPropertyOptional({ example: "Out of stock", description: "Reason/purpose of rejection" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}

export class AssignOrderRiderDto {
  @ApiPropertyOptional({ example: "Automatically assigned available rider" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RejectAssignedOrderDto {
  @ApiProperty({ example: "Bike issue, unable to complete this delivery" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class CompleteDeliveryDto {
  @ApiProperty({ example: "123456", minLength: 6, maxLength: 6 })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class PickupSubOrderDto {
  @ApiPropertyOptional({ example: "Picked up from outlet counter" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Outlet-admin enters the sub-order's pickup code to mark a customer walk-in as collected. */
export class VerifyPickupCodeDto {
  @ApiProperty({ example: "493021", minLength: 6, maxLength: 6 })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

/** Outlet-admin enters the sub-order's pickup code when a rider arrives to collect. */
export class RiderCollectSubOrderDto {
  @ApiProperty({ example: "493021", minLength: 6, maxLength: 6 })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;

  @ApiPropertyOptional({ example: "Rider collected order" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
