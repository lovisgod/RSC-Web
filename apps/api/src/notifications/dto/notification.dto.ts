import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import { IsEnum, IsString, IsUUID, Length } from "class-validator";

import { UserRole } from "../../auth/user-role.enum";

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === "string" ? value.trim() : value;

export class CreateNotificationDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  recipientId!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  recipientRole!: UserRole;

  @ApiProperty({ example: "ORDER_STATUS" })
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  type!: string;

  @ApiProperty({ example: "Order accepted" })
  @Transform(trim)
  @IsString()
  @Length(2, 160)
  title!: string;

  @ApiProperty({ example: "Your order is being prepared." })
  @Transform(trim)
  @IsString()
  @Length(2, 2_000)
  body!: string;
}
