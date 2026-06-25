import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { IsEmail, IsString, Matches } from "class-validator";

export class VerifyEmailDto {
  @ApiProperty({
    description: "The email address used during registration",
    example: "ada@example.com",
  })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "482901", minLength: 6, maxLength: 6 })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
