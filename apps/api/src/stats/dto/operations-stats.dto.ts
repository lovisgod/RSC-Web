import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { IsIn, IsOptional, IsUUID } from "class-validator";

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

export class OperationsStatsQueryDto {
  @ApiPropertyOptional({
    format: "uuid",
    description: "Optional outlet filter for super admins. Outlet admins are always scoped.",
  })
  @Transform(trim)
  @IsOptional()
  @IsUUID()
  outletId?: string;
}

export class OrderPulseQueryDto extends OperationsStatsQueryDto {
  @ApiPropertyOptional({
    enum: ["TODAY", "LAST_7_DAYS", "LAST_30_DAYS"],
    default: "TODAY",
  })
  @IsOptional()
  @IsIn(["TODAY", "LAST_7_DAYS", "LAST_30_DAYS"])
  range?: "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS";
}
