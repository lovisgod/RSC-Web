import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import type { ApplicationConfig } from "../config/configuration";
import { RedisModule } from "../redis/redis.module";
import { AuthGuard } from "./auth.guard";
import { AuthController } from "./auth.controller";
import { AuthSessionService } from "./auth-session.service";
import { AuthService } from "./auth.service";
import { Customer } from "./customer.entity";
import { EMAIL_SENDER } from "./email/email-sender";
import { NoopEmailSender } from "./email/noop-email.sender";
import { SmtpEmailSender } from "./email/smtp-email.sender";
import { PhoneOtpService } from "./otp/phone-otp.service";
import { NoopSmsSender } from "./sms/noop-sms.sender";
import { SMS_SENDER } from "./sms/sms-sender";
import { TermiiSmsSender } from "./sms/termii-sms.sender";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [TypeOrmModule.forFeature([Customer]), RedisModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionService,
    AuthGuard,
    RolesGuard,
    PhoneOtpService,
    NoopEmailSender,
    SmtpEmailSender,
    NoopSmsSender,
    TermiiSmsSender,
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService, NoopEmailSender, SmtpEmailSender],
      useFactory: (
        configService: ConfigService<ApplicationConfig, true>,
        noop: NoopEmailSender,
        smtp: SmtpEmailSender,
      ) => (configService.get("email.provider", { infer: true }) === "smtp" ? smtp : noop),
    },
    {
      provide: SMS_SENDER,
      inject: [ConfigService, NoopSmsSender, TermiiSmsSender],
      useFactory: (
        configService: ConfigService<ApplicationConfig, true>,
        noop: NoopSmsSender,
        termii: TermiiSmsSender,
      ) => (configService.get("sms.provider", { infer: true }) === "termii" ? termii : noop),
    },
  ],
  exports: [AuthGuard, RolesGuard],
})
export class AuthModule {}
