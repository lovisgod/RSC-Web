import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

const trimLower = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "Ada Okafor", minLength: 2, maxLength: 120 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @ApiPropertyOptional({ example: "08031234567" })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @Matches(/^(?:\+?234|0)[789][01]\d{8}$/)
  phone?: string;

  @ApiPropertyOptional({ example: "ada@example.com", maxLength: 254 })
  @Transform(trimLower)
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}

export class VerifyProfileChangeDto {
  @ApiProperty({ enum: ["phone", "email"], example: "email" })
  @IsIn(["phone", "email"])
  channel!: "phone" | "email";

  @ApiProperty({ example: "482901" })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
