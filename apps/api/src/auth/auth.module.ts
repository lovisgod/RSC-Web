import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import type { ApplicationConfig } from "../config/configuration";
import { RedisModule } from "../redis/redis.module";
import { Outlet } from "../outlets/outlet.entity";
import { AuthGuard } from "./auth.guard";
import { AuthController } from "./auth.controller";
import { AuthSessionService } from "./auth-session.service";
import { AuthService } from "./auth.service";
import { Customer } from "./customer.entity";
import { OptionalAuthGuard } from "./optional-auth.guard";
import { EMAIL_SENDER } from "./email/email-sender";
import { NoopEmailSender } from "./email/noop-email.sender";
import { ResendEmailSender } from "./email/resend-email.sender";
import { SmtpEmailSender } from "./email/smtp-email.sender";
import { PhoneOtpService } from "./otp/phone-otp.service";
import { NoopSmsSender } from "./sms/noop-sms.sender";
import { SlingSmsSender } from "./sms/sling-sms.sender";
import { SMS_SENDER } from "./sms/sms-sender";
import { TermiiSmsSender } from "./sms/termii-sms.sender";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Outlet]), RedisModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionService,
    AuthGuard,
    OptionalAuthGuard,
    RolesGuard,
    PhoneOtpService,
    NoopEmailSender,
    ResendEmailSender,
    SmtpEmailSender,
    NoopSmsSender,
    SlingSmsSender,
    TermiiSmsSender,
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService, NoopEmailSender, SmtpEmailSender, ResendEmailSender],
      useFactory: (
        configService: ConfigService<ApplicationConfig, true>,
        noop: NoopEmailSender,
        smtp: SmtpEmailSender,
        resend: ResendEmailSender,
      ) => {
        const provider = configService.get("email.provider", { infer: true });

        if (provider === "smtp") {
          return smtp;
        }

        if (provider === "resend") {
          return resend;
        }

        return noop;
      },
    },
    {
      provide: SMS_SENDER,
      inject: [ConfigService, NoopSmsSender, SlingSmsSender, TermiiSmsSender],
      useFactory: (
        configService: ConfigService<ApplicationConfig, true>,
        noop: NoopSmsSender,
        sling: SlingSmsSender,
        termii: TermiiSmsSender,
      ) => {
        const provider = configService.get("sms.provider", { infer: true });

        if (provider === "sling") {
          return sling;
        }

        return provider === "termii" ? termii : noop;
      },
    },
  ],
  exports: [
    AuthGuard,
    OptionalAuthGuard,
    RolesGuard,
    AuthSessionService,
    PhoneOtpService,
    EMAIL_SENDER,
    SMS_SENDER,
  ],
})
export class AuthModule {}
