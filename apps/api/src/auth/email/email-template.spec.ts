import { describe, expect, it } from "vitest";

import { renderEmailTemplate, renderOrderReceiptTemplate } from "./email-template";

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
    expect(html).toContain("DineOutNG Operations Team");
  });
});

describe(renderOrderReceiptTemplate.name, () => {
  it("renders order receipt matching checkout summary structure", () => {
    const html = renderOrderReceiptTemplate({
      email: "ada@example.com",
      customerName: "Ada Lovelace",
      masterOrderId: "12345678-abcd-ef01-2345-6789abcdef01",
      paymentReference: "PAY-REF-12345",
      paymentGateway: "paystack",
      paidAt: new Date("2026-10-25T12:00:00Z"),
      deliveryMode: "DELIVERY",
      deliveryAddress: "12 Marina Road, Lagos",
      recipientPhone: "08012345678",
      groups: [
        {
          outletName: "Burger Hub",
          subtotalMinor: 450000,
          items: [
            {
              name: "Double Cheeseburger",
              quantity: 2,
              unitPriceMinor: 200000,
              totalPriceMinor: 400000,
              notes: "No onions",
            },
            {
              name: "Fries",
              quantity: 1,
              unitPriceMinor: 50000,
              totalPriceMinor: 50000,
              notes: null,
            },
          ],
        },
      ],
      totals: {
        subtotalMinor: 450000,
        deliveryFeeMinor: 150000,
        vatMinor: 33750,
        platformCommissionMinor: 45000,
        serviceFeeMinor: 20000,
        discountMinor: 50000,
        totalMinor: 648750,
        currency: "NGN",
      },
    });

    expect(html).toContain("Payment Receipt");
    expect(html).toContain("#12345678");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("Burger Hub");
    expect(html).toContain("2x Double Cheeseburger");
    expect(html).toContain("No onions");
    expect(html).toContain("Fries");
    expect(html).toContain("Subtotal");
    expect(html).toContain("Delivery fee");
    expect(html).toContain("VAT (7.5%)");
    expect(html).toContain("Platform commission");
    expect(html).toContain("Platform fee");
    expect(html).toContain("Promo discount");
    expect(html).toContain("PAY-REF-12345");
    expect(html).toContain("12 Marina Road, Lagos");
  });
});
