import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
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
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";
import {
  AdminDataDto,
  AdminResponseDto,
  LoginDataDto,
  LoginResponseDto,
  LogoutDataDto,
  LogoutResponseDto,
  RegistrationDataDto,
  RegistrationResponseDto,
  ResendVerificationCodeDataDto,
  ResendVerificationCodeResponseDto,
  UserVerificationDataDto,
  UserVerificationResponseDto,
} from "./dto/auth-response.dto";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from "./dto/password.dto";
import { RegisterCustomerDto } from "./dto/register-customer.dto";
import { ResendVerificationCodeDto, VerifyUserDto } from "./dto/verify-user.dto";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./auth.constants";
import type { AuthenticatedRequest } from "./auth-request";
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
  @RateLimit({ limit: 5, windowSeconds: 600, keyBy: "ip-and-identifier" })
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
  @RateLimit({ limit: 10, windowSeconds: 600, keyBy: "ip-and-identifier" })
  @ApiMessage("User verified successfully")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify a customer using a phone or email OTP" })
  @ApiOkResponse({
    description: "Selected channel verified and customer account activated",
    type: UserVerificationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "OTP is incorrect, expired, or already consumed" })
  verifyUser(@Body() input: VerifyUserDto): Promise<UserVerificationDataDto> {
    return this.authService.verifyUser({ code: input.code });
  }

  @Post("resend-verification-code")
  @RateLimit({ limit: 5, windowSeconds: 600, keyBy: "ip-and-identifier" })
  @ApiMessage("Verification code resent")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend a phone or email verification OTP" })
  @ApiOkResponse({
    description: "Fresh OTP dispatched to the requested channel",
    type: ResendVerificationCodeResponseDto,
  })
  resendVerificationCode(
    @Body() input: ResendVerificationCodeDto,
  ): Promise<ResendVerificationCodeDataDto> {
    return this.authService.resendVerificationCode(input);
  }

  @Post("login")
  @RateLimit({ limit: 10, windowSeconds: 300, keyBy: "ip-and-identifier" })
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

  @Post("refresh")
  @RateLimit({ limit: 30, windowSeconds: 60 })
  @ApiMessage("Session refreshed")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh the active auth session using the refresh cookie" })
  @ApiOkResponse({
    description: "Refresh token accepted and rotated; fresh HttpOnly auth cookies issued",
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Refresh token is missing, expired, reused, or invalid" })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginDataDto> {
    const refreshToken = readCookie(request.headers.cookie, REFRESH_TOKEN_COOKIE);

    if (!refreshToken) {
      clearAuthCookies(response);
      throw new UnauthorizedException("Authentication required");
    }

    const session = await this.sessions.refreshSession(refreshToken);

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

  @Post("change-password")
  @RateLimit({ limit: 5, windowSeconds: 600 })
  @ApiMessage("Password changed successfully")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Change the active user's password" })
  changePassword(@Req() request: AuthenticatedRequest, @Body() input: ChangePasswordDto) {
    return this.authService.changePassword(request.user!, input);
  }

  @Post("forgot-password")
  @RateLimit({ limit: 5, windowSeconds: 600, keyBy: "ip-and-identifier" })
  @ApiMessage("Password reset codes sent if the account exists")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Send password reset OTPs to the user's phone and email" })
  forgotPassword(@Body() input: ForgotPasswordDto) {
    return this.authService.forgotPassword(input);
  }

  @Post("reset-password")
  @RateLimit({ limit: 5, windowSeconds: 600, keyBy: "ip-and-identifier" })
  @ApiMessage("Password reset successfully")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset a password using a phone or email OTP" })
  resetPassword(@Body() input: ResetPasswordDto) {
    return this.authService.resetPassword(input);
  }

  @Post("admins")
  @RateLimit({ limit: 10, windowSeconds: 600 })
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
