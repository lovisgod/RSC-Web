import { afterEach, describe, expect, it } from "vitest";

import { createEmailSenderFromEnv } from "./create-email-sender";
import { NoopEmailSender } from "./noop-email.sender";
import { ResendEmailSender } from "./resend-email.sender";
import { SmtpEmailSender } from "./smtp-email.sender";

describe(createEmailSenderFromEnv.name, () => {
  const originalEnv = process.env.EMAIL_PROVIDER;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.EMAIL_PROVIDER;
    } else {
      process.env.EMAIL_PROVIDER = originalEnv;
    }
  });

  it("returns NoopEmailSender by default or when provider is noop", () => {
    delete process.env.EMAIL_PROVIDER;
    expect(createEmailSenderFromEnv()).toBeInstanceOf(NoopEmailSender);

    process.env.EMAIL_PROVIDER = "noop";
    expect(createEmailSenderFromEnv()).toBeInstanceOf(NoopEmailSender);
  });

  it("returns ResendEmailSender when provider is resend", () => {
    process.env.EMAIL_PROVIDER = "resend";
    expect(createEmailSenderFromEnv()).toBeInstanceOf(ResendEmailSender);
  });

  it("returns SmtpEmailSender when provider is smtp", () => {
    process.env.EMAIL_PROVIDER = "smtp";
    expect(createEmailSenderFromEnv()).toBeInstanceOf(SmtpEmailSender);
  });
});
