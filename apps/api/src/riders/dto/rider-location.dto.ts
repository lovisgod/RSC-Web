import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsLatitude, IsLongitude, IsOptional, IsUUID } from "class-validator";

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
