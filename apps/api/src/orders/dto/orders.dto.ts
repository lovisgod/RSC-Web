import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength } from "class-validator";

import { MasterOrderStatus } from "../order-status.enum";

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: MasterOrderStatus, example: MasterOrderStatus.OUT_FOR_DELIVERY })
  @IsEnum(MasterOrderStatus)
  status!: MasterOrderStatus;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  riderId?: string;

  @ApiPropertyOptional({ example: "Rider assigned" })
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
