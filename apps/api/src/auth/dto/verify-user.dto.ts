import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { Allow, IsEmail, IsIn, IsString, Matches, ValidateIf } from "class-validator";

export type VerificationChannel = "phone" | "email";

export class VerifyUserDto {
  @ApiProperty({ example: "482901", minLength: 6, maxLength: 6 })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;

  @Allow()
  channel?: unknown;

  @Allow()
  phone?: unknown;

  @Allow()
  email?: unknown;
}

export class ResendVerificationCodeDto {
  @ApiProperty({
    enum: ["phone", "email"],
    example: "phone",
    description: "The verification channel that should receive a fresh OTP",
  })
  @IsIn(["phone", "email"])
  channel!: VerificationChannel;

  @ApiPropertyOptional({
    description: "Required when channel is phone",
    example: "08031234567",
  })
  @ValidateIf((input: ResendVerificationCodeDto) => input.channel === "phone")
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Matches(/^(?:\+?234|0)[789][01]\d{8}$/)
  phone?: string;

  @ApiPropertyOptional({
    description: "Required when channel is email",
    example: "ada@example.com",
  })
  @ValidateIf((input: ResendVerificationCodeDto) => input.channel === "email")
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email?: string;
}
