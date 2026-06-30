import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

const trimLower = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

export class CreateRiderDto {
  @ApiProperty({ example: "Rider One", minLength: 2, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: "rider.one@yopmail.com", maxLength: 254 })
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: "08031234567" })
  @Transform(trim)
  @IsString()
  @Matches(/^(?:\+?234|0)[789][01]\d{8}$/)
  phone!: string;

  @ApiPropertyOptional({ example: "bike" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(2, 40)
  vehicleType?: string;

  @ApiPropertyOptional({ example: "ABC-123XY" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(2, 40)
  plateNumber?: string;
}
