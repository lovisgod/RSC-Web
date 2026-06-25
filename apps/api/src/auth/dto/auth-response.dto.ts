import { ApiProperty } from "@nestjs/swagger";

export class RegistrationDataDto {
  @ApiProperty({ example: "2abf9577-027c-4936-83a8-e004fd56a46e", format: "uuid" })
  customerId!: string;

  @ApiProperty({ enum: ["UNVERIFIED"], example: "UNVERIFIED" })
  status!: "UNVERIFIED";

  @ApiProperty({ example: 600, description: "Seconds until the phone OTP expires" })
  otpExpiresInSeconds!: number;

  @ApiProperty({ example: { phone: false, email: false } })
  verificationChannels!: { phone: boolean; email: boolean };
}

export class PhoneVerificationDataDto {
  @ApiProperty({ example: "2abf9577-027c-4936-83a8-e004fd56a46e", format: "uuid" })
  customerId!: string;

  @ApiProperty({ enum: ["ACTIVE"], example: "ACTIVE" })
  status!: "ACTIVE";

  @ApiProperty({ example: "2026-06-23T10:00:00.000Z", format: "date-time" })
  phoneVerifiedAt!: string;

  @ApiProperty({ example: { phone: true, email: false } })
  verificationChannels!: { phone: boolean; email: boolean };
}

export class EmailVerificationDataDto {
  @ApiProperty({ example: "2abf9577-027c-4936-83a8-e004fd56a46e", format: "uuid" })
  customerId!: string;

  @ApiProperty({ enum: ["ACTIVE"], example: "ACTIVE" })
  status!: "ACTIVE";

  @ApiProperty({ example: "2026-06-23T10:00:00.000Z", format: "date-time" })
  emailVerifiedAt!: string;

  @ApiProperty({ example: { phone: false, email: true } })
  verificationChannels!: { phone: boolean; email: boolean };
}

export class RegistrationResponseDto {
  @ApiProperty({ type: RegistrationDataDto })
  data!: RegistrationDataDto;

  @ApiProperty({ example: "Customer registered; verification code sent" })
  message!: string;

  @ApiProperty({ example: 201 })
  status!: number;
}

export class PhoneVerificationResponseDto {
  @ApiProperty({ type: PhoneVerificationDataDto })
  data!: PhoneVerificationDataDto;

  @ApiProperty({ example: "Phone verified successfully" })
  message!: string;

  @ApiProperty({ example: 200 })
  status!: number;
}

export class EmailVerificationResponseDto {
  @ApiProperty({ type: EmailVerificationDataDto })
  data!: EmailVerificationDataDto;

  @ApiProperty({ example: "Email verified successfully" })
  message!: string;

  @ApiProperty({ example: 200 })
  status!: number;
}
