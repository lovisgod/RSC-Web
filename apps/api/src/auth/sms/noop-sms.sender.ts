import { Injectable } from "@nestjs/common";

import type { SmsSender } from "./sms-sender";

@Injectable()
export class NoopSmsSender implements SmsSender {
  sendPhoneVerification(): Promise<void> {
    // Intentionally does not log the OTP or customer phone number.
    return Promise.resolve();
  }

  sendPasswordReset(): Promise<void> {
    // Intentionally does not log the OTP or customer phone number.
    return Promise.resolve();
  }
}
