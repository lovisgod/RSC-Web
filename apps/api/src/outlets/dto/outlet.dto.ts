import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ProvisionSubaccountDto {
  @ApiProperty({ example: "RSC Kitchen — Lekki" })
  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  businessName!: string;

  @ApiProperty({
    example: "058",
    description: "Paystack bank code. Use GET /api/v1/payments/banks to list available codes.",
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 10)
  bankCode!: string;

  @ApiProperty({ example: "0123456789" })
  @IsString()
  @IsNotEmpty()
  @Length(10, 10)
  accountNumber!: string;

  @ApiPropertyOptional({
    description: "Set to true to re-provision even if a subaccount code already exists.",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class SetSubaccountCodeDto {
  @ApiProperty({ example: "ACCT_abc123xyz" })
  @IsString()
  @Length(2, 128, { message: "Subaccount code must be between 2 and 128 characters long" })
  subaccountCode!: string;
}
