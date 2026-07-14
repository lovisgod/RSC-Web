import { describe, expect, it } from "vitest";

import { renderEmailTemplate } from "./email-template";

describe(renderEmailTemplate.name, () => {
  it("renders code emails with a footer and grey code container", () => {
    const html = renderEmailTemplate({
      preheader: "Use this code to continue.",
      heading: "Verify your email",
      greetingName: "Ada",
      intro: "Use the verification code below.",
      codeLabel: "Verification code",
      code: "482901",
    });

    expect(html).toContain("background: #f3f4f6");
    expect(html).toContain("482901");
    expect(html).toContain("RSC Operations Team");
  });
});
