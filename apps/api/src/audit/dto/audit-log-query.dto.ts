import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

const toNumber = ({ value }: TransformFnParams): unknown =>
  value === undefined || value === null || value === "" ? undefined : Number(value);

export class AuditLogQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 100 })
  @Transform(toNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ format: "uuid" })
  @Transform(trim)
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ example: "POST /api/v1/payments/initiate" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: "payments" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ example: "RSC-reference" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ example: "2026-07-01T00:00:00.000Z" })
  @Transform(trim)
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: "2026-07-31T23:59:59.999Z" })
  @Transform(trim)
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
