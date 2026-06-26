import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { IsString, Length, Matches } from "class-validator";

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

  @ApiProperty({ example: "482901" })
  @IsString()
  @Matches(/^\d{6}$/)
  phoneCode!: string;

  @ApiProperty({ example: "193847" })
  @IsString()
  @Matches(/^\d{6}$/)
  emailCode!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  newPassword!: string;
}
