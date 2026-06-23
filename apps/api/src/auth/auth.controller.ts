import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { AuthService, type PhoneVerificationResult, type RegistrationResult } from "./auth.service";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
import { VerifyPhoneDto } from "./dto/verify-phone.dto";

@ApiTags("Authentication")
@Controller({ path: "auth", version: "1" })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a customer and send a phone verification OTP" })
  @ApiCreatedResponse({ description: "Customer created in UNVERIFIED state" })
  @ApiConflictResponse({ description: "Phone or email already belongs to an account" })
  @ApiBadGatewayResponse({ description: "The SMS provider could not dispatch the OTP" })
  register(@Body() input: RegisterCustomerDto): Promise<RegistrationResult> {
    return this.authService.register(input);
  }

  @Post("verify-phone")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify a customer phone number using the SMS OTP" })
  @ApiOkResponse({ description: "Phone verified and customer account activated" })
  @ApiUnauthorizedResponse({ description: "OTP is incorrect, expired, or already consumed" })
  verifyPhone(@Body() input: VerifyPhoneDto): Promise<PhoneVerificationResult> {
    return this.authService.verifyPhone(input);
  }
}
