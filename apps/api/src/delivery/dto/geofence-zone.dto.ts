import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, IsString, Length } from "class-validator";

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateGeofenceZoneDto {
  @ApiProperty({ example: "Lekki Phase 1" })
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({
    description: "GeoJSON Polygon coordinates: [[[lng, lat], ...closed ring]]",
    example: [
      [
        [3.447, 6.431],
        [3.491, 6.431],
        [3.491, 6.47],
        [3.447, 6.47],
        [3.447, 6.431],
      ],
    ],
  })
  @IsArray()
  coordinates!: unknown[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateGeofenceZoneDto extends PartialType(CreateGeofenceZoneDto) {}
