import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
  Max,
  ValidateIf,
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

  @ApiPropertyOptional({ example: "https://cdn.example.com/outlet-logo.png" })
  @Transform(trim)
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(512)
  logoUrl?: string;

  @ApiPropertyOptional({ example: "https://cdn.example.com/outlet-banner.jpg" })
  @Transform(trim)
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(512)
  bannerUrl?: string;

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
    description:
      "Outlet latitude for display and operations metadata; checkout uses geofence zones.",
  })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({
    example: 3.4542,
    description:
      "Outlet longitude for display and operations metadata; checkout uses geofence zones.",
  })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({
    example: 15,
    description:
      "Legacy outlet radius metadata. Checkout delivery eligibility uses geofence zones.",
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  deliveryRadiusKm?: number;

  @ApiPropertyOptional({ example: "merchant_outlet_123" })
  @Transform(trim)
  @IsOptional()
  @ValidateIf((object, value) => value !== null && value !== "")
  @IsString()
  @Length(2, 100)
  @Matches(/^\S+$/, { message: "settlementSubaccountCode must not contain spaces" })
  settlementSubaccountCode?: string | null;
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

  @ApiPropertyOptional({
    example: 350000,
    nullable: true,
    description: "Promotional item price in minor units. Must be lower than priceMinor.",
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsInt()
  @Min(1)
  discountPriceMinor?: number | null;

  @ApiPropertyOptional({
    example: "2026-07-27T08:00:00.000Z",
    nullable: true,
    description: "Optional instant when the item discount becomes active.",
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsDateString()
  discountStartsAt?: string | null;

  @ApiPropertyOptional({
    example: "2026-07-27T20:00:00.000Z",
    nullable: true,
    description: "Optional instant when the item discount stops being active.",
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsDateString()
  discountEndsAt?: string | null;

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

export class CreatePreparationSuggestionDto {
  @ApiProperty({ example: "Mild salt" })
  @Transform(trim)
  @IsString()
  @Length(1, 255)
  text!: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  outletId?: string | null;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  menuItemId?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdatePreparationSuggestionDto extends PartialType(CreatePreparationSuggestionDto) {}

export class QueryPreparationSuggestionsDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  menuItemId?: string;

  @ApiPropertyOptional({ example: "mild" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
