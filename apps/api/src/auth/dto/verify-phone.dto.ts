import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Matches } from "class-validator";

export class VerifyPhoneDto {
  @ApiProperty({
    description: "The Nigerian mobile number used during registration",
    example: "08031234567",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Matches(/^(?:\+?234|0)[789][01]\d{8}$/)
  phone!: string;

  @ApiProperty({ example: "482901", minLength: 6, maxLength: 6 })
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
