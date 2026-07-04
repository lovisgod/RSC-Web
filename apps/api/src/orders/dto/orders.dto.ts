import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
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

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: MasterOrderStatus, example: MasterOrderStatus.OUT_FOR_DELIVERY })
  @IsEnum(MasterOrderStatus)
  status!: MasterOrderStatus;

  @ApiPropertyOptional({ example: "Rider assigned" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AssignOrderRiderDto {
  @ApiPropertyOptional({ example: "Automatically assigned nearest rider" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CompleteDeliveryDto {
  @ApiProperty({ example: "123456", minLength: 6, maxLength: 6 })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
