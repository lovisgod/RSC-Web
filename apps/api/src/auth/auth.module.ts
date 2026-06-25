import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import type { ApplicationConfig } from "../config/configuration";
import { RedisModule } from "../redis/redis.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { Customer } from "./customer.entity";
import { EMAIL_SENDER } from "./email/email-sender";
import { NoopEmailSender } from "./email/noop-email.sender";
import { ResendEmailSender } from "./email/resend-email.sender";
import { PhoneOtpService } from "./otp/phone-otp.service";
import { NoopSmsSender } from "./sms/noop-sms.sender";
import { SMS_SENDER } from "./sms/sms-sender";
import { TermiiSmsSender } from "./sms/termii-sms.sender";

@Module({
  imports: [TypeOrmModule.forFeature([Customer]), RedisModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PhoneOtpService,
    NoopEmailSender,
    ResendEmailSender,
    NoopSmsSender,
    TermiiSmsSender,
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService, NoopEmailSender, ResendEmailSender],
      useFactory: (
        configService: ConfigService<ApplicationConfig, true>,
        noop: NoopEmailSender,
        resend: ResendEmailSender,
      ) => (configService.get("email.provider", { infer: true }) === "resend" ? resend : noop),
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
})
export class AuthModule {}
