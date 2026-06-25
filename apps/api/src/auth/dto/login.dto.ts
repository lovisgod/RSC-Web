import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { IsString, Length } from "class-validator";

export class LoginDto {
  @ApiProperty({
    description: "Email address or Nigerian mobile number used during registration",
    example: "ada@example.com",
  })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsString()
  identifier!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  password!: string;
}
