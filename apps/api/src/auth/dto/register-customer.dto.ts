import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { IsEmail, IsString, Length, Matches, MaxLength } from "class-validator";

export class RegisterCustomerDto {
  @ApiProperty({ example: "Ada Okafor", maxLength: 120 })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({
    description: "Nigerian mobile number in local or international format",
    example: "08031234567",
  })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Matches(/^(?:\+?234|0)[789][01]\d{8}$/)
  phone!: string;

  @ApiProperty({ example: "ada@example.com", maxLength: 254 })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
