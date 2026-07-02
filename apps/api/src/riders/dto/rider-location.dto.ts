import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class RecordRiderLocationDto {
  @ApiProperty({ example: 6.4474 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 3.4542 })
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  masterOrderId?: string;
}

const toNumber = ({ value }: TransformFnParams): unknown =>
  value === undefined || value === null || value === "" ? undefined : Number(value);

export class RiderDeliveriesQueryDto {
  @ApiPropertyOptional({ example: "2026-06-01T00:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: "2026-06-30T23:59:59.999Z" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ enum: ["PENDING", "SUCCESS", "FAILED"], example: "SUCCESS" })
  @IsOptional()
  @IsIn(["PENDING", "SUCCESS", "FAILED"])
  payoutStatus?: "PENDING" | "SUCCESS" | "FAILED";

  @ApiPropertyOptional({ enum: ["DELIVERY", "TAKEOUT"], example: "DELIVERY" })
  @IsOptional()
  @IsIn(["DELIVERY", "TAKEOUT"])
  deliveryMode?: "DELIVERY" | "TAKEOUT";

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
