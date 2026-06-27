import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { IsOptional, IsString, Length, Matches } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  currentPassword!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  newPassword!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: "ada@example.com" })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsString()
  identifier!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: "ada@example.com" })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsString()
  identifier!: string;

  @ApiPropertyOptional({
    example: "482901",
    description: "Phone reset OTP. Either phoneCode or emailCode is required.",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  phoneCode?: string;

  @ApiPropertyOptional({
    example: "193847",
    description: "Email reset OTP. Either emailCode or phoneCode is required.",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  emailCode?: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  newPassword!: string;
}
