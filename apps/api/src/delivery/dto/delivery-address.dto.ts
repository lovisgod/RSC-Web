import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from "class-validator";

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateDeliveryAddressDto {
  @ApiProperty({ example: "Home" })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  label!: string;

  @ApiProperty({ example: "12 Admiralty Way, Lekki Phase 1" })
  @Transform(trim)
  @IsString()
  @Length(5, 1_000)
  addressLine!: string;

  @ApiPropertyOptional({ example: "Lagos" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ example: "Lagos" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  state?: string;

  @ApiProperty({ example: 6.4474 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 3.4542 })
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateDeliveryAddressDto extends PartialType(CreateDeliveryAddressDto) {}

export class SetDefaultDeliveryAddressDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  addressId!: string;
}

export class ValidateAddressDto {
  @ApiProperty({ example: 6.4474 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 3.4542 })
  @IsLongitude()
  longitude!: number;
}
