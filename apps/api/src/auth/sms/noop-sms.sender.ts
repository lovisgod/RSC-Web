import { Injectable } from "@nestjs/common";

import type { SendPhoneVerificationInput, SmsSender } from "./sms-sender";

@Injectable()
export class NoopSmsSender implements SmsSender {
  async sendPhoneVerification(_input: SendPhoneVerificationInput): Promise<void> {
    // Intentionally does not log the OTP or customer phone number.
  }
}
