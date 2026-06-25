import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Request, Response } from "express";

import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { ApiMessage } from "../common/http/api-message.decorator";
import {
  AdminDataDto,
  AdminResponseDto,
  LoginDataDto,
  LoginResponseDto,
  LogoutDataDto,
  LogoutResponseDto,
  RegistrationDataDto,
  RegistrationResponseDto,
  UserVerificationDataDto,
  UserVerificationResponseDto,
} from "./dto/auth-response.dto";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
import { VerifyUserDto } from "./dto/verify-user.dto";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./auth.constants";
import { AuthSessionService } from "./auth-session.service";
import { clearAuthCookies, readCookie, setAuthCookies } from "./cookies";
import { Roles } from "./roles.decorator";
import { RolesGuard } from "./roles.guard";
import { UserRole } from "./user-role.enum";

@ApiTags("Authentication")
@Controller({ path: "auth", version: "1" })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: AuthSessionService,
  ) {}

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

  @Post("login")
  @ApiMessage("Login successful")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Log in with email or phone and password" })
  @ApiOkResponse({
    description: "Login accepted and HttpOnly auth cookies issued",
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Credentials are invalid or account is inactive" })
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginDataDto> {
    const session = await this.authService.login(input);

    setAuthCookies(response, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      accessTokenMaxAgeSeconds: session.accessTokenExpiresInSeconds,
      refreshTokenMaxAgeSeconds: session.refreshTokenExpiresInSeconds,
    });

    return {
      user: session.user,
      accessTokenExpiresInSeconds: session.accessTokenExpiresInSeconds,
      refreshTokenExpiresInSeconds: session.refreshTokenExpiresInSeconds,
    };
  }

  @Post("logout")
  @ApiMessage("Logged out successfully")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Log out and invalidate the active auth session" })
  @ApiOkResponse({
    description: "Active session token blacklisted and auth cookies cleared",
    type: LogoutResponseDto,
  })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LogoutDataDto> {
    await this.sessions.revokeSession(
      readCookie(request.headers.cookie, ACCESS_TOKEN_COOKIE),
      readCookie(request.headers.cookie, REFRESH_TOKEN_COOKIE),
    );
    clearAuthCookies(response);

    return { loggedOut: true };
  }

  @Post("admins")
  @ApiMessage("Admin created successfully")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Create an outlet admin account" })
  @ApiCreatedResponse({
    description: "Outlet admin account created",
    type: AdminResponseDto,
  })
  createAdmin(@Body() input: CreateAdminDto): Promise<AdminDataDto> {
    return this.authService.createAdmin(input);
  }
}
