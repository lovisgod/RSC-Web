import { ApiProperty } from "@nestjs/swagger";

export class RegistrationResponseDto {
  @ApiProperty({ example: "2abf9577-027c-4936-83a8-e004fd56a46e", format: "uuid" })
  customerId!: string;

  @ApiProperty({ enum: ["UNVERIFIED"], example: "UNVERIFIED" })
  status!: "UNVERIFIED";

  @ApiProperty({ example: 600, description: "Seconds until the phone OTP expires" })
  otpExpiresInSeconds!: number;
}

export class PhoneVerificationResponseDto {
  @ApiProperty({ example: "2abf9577-027c-4936-83a8-e004fd56a46e", format: "uuid" })
  customerId!: string;

  @ApiProperty({ enum: ["ACTIVE"], example: "ACTIVE" })
  status!: "ACTIVE";

  @ApiProperty({ example: "2026-06-23T10:00:00.000Z", format: "date-time" })
  phoneVerifiedAt!: string;
}
