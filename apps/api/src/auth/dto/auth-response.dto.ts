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

export class UserVerificationDataDto {
  @ApiProperty({ example: "2abf9577-027c-4936-83a8-e004fd56a46e", format: "uuid" })
  customerId!: string;

  @ApiProperty({ enum: ["ACTIVE"], example: "ACTIVE" })
  status!: "ACTIVE";

  @ApiProperty({ enum: ["phone", "email"], example: "phone" })
  channel!: "phone" | "email";

  @ApiProperty({ example: "2026-06-23T10:00:00.000Z", format: "date-time" })
  verifiedAt!: string;

  @ApiProperty({ example: { phone: true, email: false } })
  verificationChannels!: { phone: boolean; email: boolean };
}

export class LoginUserDto {
  @ApiProperty({ example: "2abf9577-027c-4936-83a8-e004fd56a46e", format: "uuid" })
  id!: string;

  @ApiProperty({ enum: ["SUPER_ADMIN", "CUSTOMER", "ADMIN", "RIDER"], example: "CUSTOMER" })
  role!: "SUPER_ADMIN" | "CUSTOMER" | "ADMIN" | "RIDER";
}

export class LoginDataDto {
  @ApiProperty({ type: LoginUserDto })
  user!: LoginUserDto;

  @ApiProperty({ example: 900 })
  accessTokenExpiresInSeconds!: number;

  @ApiProperty({ example: 604800 })
  refreshTokenExpiresInSeconds!: number;
}

export class LogoutDataDto {
  @ApiProperty({ example: true })
  loggedOut!: boolean;
}

export class AdminDataDto {
  @ApiProperty({ example: "2abf9577-027c-4936-83a8-e004fd56a46e", format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Outlet Manager" })
  name!: string;

  @ApiProperty({ enum: ["ADMIN"], example: "ADMIN" })
  role!: "ADMIN";

  @ApiProperty({ format: "uuid" })
  outletId!: string;

  @ApiProperty({
    description: "System-generated temporary password for first login",
    example: "e9FPuxWz3zRaAa1!",
  })
  temporaryPassword!: string;
}

export class RegistrationResponseDto {
  @ApiProperty({ type: RegistrationDataDto })
  data!: RegistrationDataDto;

  @ApiProperty({ example: "Customer registered; verification code sent" })
  message!: string;

  @ApiProperty({ example: 201 })
  status!: number;
}

export class UserVerificationResponseDto {
  @ApiProperty({ type: UserVerificationDataDto })
  data!: UserVerificationDataDto;

  @ApiProperty({ example: "User verified successfully" })
  message!: string;

  @ApiProperty({ example: 200 })
  status!: number;
}

export class LoginResponseDto {
  @ApiProperty({ type: LoginDataDto })
  data!: LoginDataDto;

  @ApiProperty({ example: "Login successful" })
  message!: string;

  @ApiProperty({ example: 200 })
  status!: number;
}

export class LogoutResponseDto {
  @ApiProperty({ type: LogoutDataDto })
  data!: LogoutDataDto;

  @ApiProperty({ example: "Logged out successfully" })
  message!: string;

  @ApiProperty({ example: 200 })
  status!: number;
}

export class AdminResponseDto {
  @ApiProperty({ type: AdminDataDto })
  data!: AdminDataDto;

  @ApiProperty({ example: "Admin created successfully" })
  message!: string;

  @ApiProperty({ example: 201 })
  status!: number;
}
