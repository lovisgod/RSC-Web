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

import { AuthService } from "./auth.service";
import { ApiMessage } from "../common/http/api-message.decorator";
import {
  RegistrationDataDto,
  RegistrationResponseDto,
  UserVerificationDataDto,
  UserVerificationResponseDto,
} from "./dto/auth-response.dto";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
import { VerifyUserDto } from "./dto/verify-user.dto";

@ApiTags("Authentication")
@Controller({ path: "auth", version: "1" })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiMessage("Customer registered; verification codes sent")
  @ApiOperation({ summary: "Register a customer and send phone and email verification OTPs" })
  @ApiCreatedResponse({
    description: "Customer created in UNVERIFIED state",
    type: RegistrationResponseDto,
  })
  @ApiConflictResponse({ description: "Phone or email already belongs to an account" })
  @ApiBadGatewayResponse({ description: "A verification provider could not dispatch an OTP" })
  register(@Body() input: RegisterCustomerDto): Promise<RegistrationDataDto> {
    return this.authService.register(input);
  }

  @Post("verify-user")
  @ApiMessage("User verified successfully")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify a customer using a phone or email OTP" })
  @ApiOkResponse({
    description: "Selected channel verified and customer account activated",
    type: UserVerificationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "OTP is incorrect, expired, or already consumed" })
  verifyUser(@Body() input: VerifyUserDto): Promise<UserVerificationDataDto> {
    return this.authService.verifyUser(input);
  }
}
