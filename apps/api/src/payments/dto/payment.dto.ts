import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsPhoneNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from "class-validator";

export class CheckoutModifierDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  modifierId!: string;
}

export class CheckoutItemDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  menuItemId!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ type: [CheckoutModifierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutModifierDto)
  modifiers?: CheckoutModifierDto[];

  @ApiPropertyOptional({ example: "No onions" })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  customerNote?: string;
}

export class InitiatePaymentDto {
  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @ApiProperty({ enum: ["DELIVERY", "TAKEOUT"], example: "DELIVERY" })
  @IsIn(["DELIVERY", "TAKEOUT"])
  deliveryMode!: "DELIVERY" | "TAKEOUT";

  @ApiPropertyOptional({ example: "12 Admiralty Way, Lekki Phase 1" })
  @IsOptional()
  @IsString()
  @Length(5, 1_000)
  deliveryAddress?: string;

  @ApiPropertyOptional({ example: 6.4474 })
  @IsOptional()
  @IsLatitude()
  deliveryLatitude?: number;

  @ApiPropertyOptional({ example: 3.4542 })
  @IsOptional()
  @IsLongitude()
  deliveryLongitude?: number;

  @ApiPropertyOptional({
    example: "08031234567",
    description: "Phone number of the person receiving the order when ordering on behalf.",
  })
  @IsOptional()
  @IsPhoneNumber("NG")
  recipientPhone?: string;

  @ApiPropertyOptional({ example: "Make everything mildly spicy", maxLength: 1_000 })
  @IsOptional()
  @IsString()
  @Length(1, 1_000)
  preparationNote?: string;
}
