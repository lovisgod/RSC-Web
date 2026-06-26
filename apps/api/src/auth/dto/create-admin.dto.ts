import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { IsEmail, IsString, IsUUID, Length, Matches } from "class-validator";

export class CreateAdminDto {
  @ApiProperty({ example: "Outlet Manager", minLength: 2, maxLength: 120 })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: "manager@example.com" })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "08031234567" })
  @Transform(({ value }: TransformFnParams): unknown =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Matches(/^(?:\+?234|0)[789][01]\d{8}$/)
  phone!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  outletId!: string;
}
