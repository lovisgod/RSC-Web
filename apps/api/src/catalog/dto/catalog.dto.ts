import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from "class-validator";

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

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

  @ApiProperty({ example: "MOMENT_SUBACCOUNT_123" })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  momentSubaccountCode!: string;
}

export class UpdateOutletDto extends PartialType(CreateOutletDto) {}

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
