import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { IsOptional, IsUUID } from "class-validator";

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

export class OutletAdminQueryDto {
  @ApiPropertyOptional({ format: "uuid", description: "Filter admins by outlet." })
  @Transform(trim)
  @IsOptional()
  @IsUUID()
  outletId?: string;
}
