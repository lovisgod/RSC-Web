import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  MaxLength,
  Min,
  Max,
} from "class-validator";

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

const toBoolean = ({ value }: TransformFnParams): unknown =>
  value === true || value === "true" || value === "1";

export class CreateOutletDto {
  @ApiProperty({ example: "Farfallino Kitchen" })
  @Transform(trim)
  @IsString()
  @Length(2, 255)
  name!: string;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @ApiPropertyOptional({ example: "12 Admiralty Way, Lekki Phase 1" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  address?: string;

  @ApiProperty({ example: "Italian" })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  cuisineType!: string;

  @ApiPropertyOptional({ example: "https://cdn.example.com/outlet.jpg" })
  @Transform(trim)
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(512)
  imageUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({ example: 750, description: "Outlet VAT in basis points. 1000 = 10%." })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  vatBps?: number;

  @ApiPropertyOptional({
    example: 6.4474,
    description: "Outlet latitude used for delivery radius checks when configured",
  })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({
    example: 3.4542,
    description: "Outlet longitude used for delivery radius checks when configured",
  })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ example: 15, description: "Maximum delivery radius in kilometers" })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  deliveryRadiusKm?: number;

  @ApiProperty({ example: "MOMENT_SUBACCOUNT_123" })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  momentSubaccountCode!: string;
}

export class UpdateOutletDto extends PartialType(CreateOutletDto) {}

export class UpdateOutletOnlineStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isOnline!: boolean;
}

export class CreateMenuCategoryDto {
  @ApiPropertyOptional({
    format: "uuid",
    description: "Required for SUPER_ADMIN; ignored for outlet admins",
  })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiProperty({ example: "Rice Bowls" })
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMenuCategoryDto extends PartialType(CreateMenuCategoryDto) {}

export class ListMenuItemsQueryDto {
  @ApiPropertyOptional({ format: "uuid", description: "Filter menu items to one outlet." })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({
    example: "jollof",
    description: "Case-insensitive search across item name and description.",
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      "When true, returns { items, total, limit, offset, hasMore } for infinite-scroll clients. When false or omitted, returns the legacy array response.",
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  paginated?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 30 })
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

export class CreateMenuItemDto {
  @ApiPropertyOptional({
    format: "uuid",
    description: "Required for SUPER_ADMIN; ignored for outlet admins",
  })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: "Jollof Rice" })
  @Transform(trim)
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(512)
  imageUrl?: string;

  @ApiPropertyOptional({ example: "25-35 mins", maxLength: 60 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  deliveryTimeRange?: string;

  @ApiProperty({ example: 450000 })
  @IsInt()
  @Min(0)
  priceMinor!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ type: [String], format: "uuid" })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  modifierGroupIds?: string[];
}

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}

export class UpdateMenuItemAvailabilityDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isAvailable!: boolean;
}

export class RateMenuItemDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: "Loved it", maxLength: 1_000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  comment?: string;
}

export class RateOutletDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: "Great food and prompt delivery", maxLength: 1_000 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  comment?: string;
}

export class CreateItemModifierGroupDto {
  @ApiPropertyOptional({
    format: "uuid",
    description: "Required for SUPER_ADMIN; ignored for outlet admins",
  })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiProperty({ example: "Protein" })
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSelections?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxSelections?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateItemModifierGroupDto extends PartialType(CreateItemModifierGroupDto) {}

export class CreateItemModifierDto {
  @ApiPropertyOptional({
    format: "uuid",
    description: "Required for SUPER_ADMIN; ignored for outlet admins",
  })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  groupId!: string;

  @ApiProperty({ example: "Chicken" })
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  priceDeltaMinor?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateItemModifierDto extends PartialType(CreateItemModifierDto) {}
