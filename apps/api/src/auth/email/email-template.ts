import type { SendOrderReceiptEmailInput } from "./email-sender";

export interface EmailTemplateInput {
  preheader: string;
  heading: string;
  greetingName: string;
  intro: string;
  codeLabel?: string;
  code?: string;
  body?: string;
  footerNote?: string;
}

export function renderEmailTemplate(input: EmailTemplateInput): string {
  const codeBlock =
    input.code && input.codeLabel
      ? `
        <tr>
          <td style="padding: 0 32px 24px;">
            <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">${escapeHtml(input.codeLabel)}</p>
            <div style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px; text-align: center;">
              <span style="color: #111827; font-size: 30px; font-weight: 800; letter-spacing: 0.16em; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;">${escapeHtml(input.code)}</span>
            </div>
          </td>
        </tr>`
      : "";

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(input.heading)}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #f5f6f8; font-family: Arial, Helvetica, sans-serif; color: #111827;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(input.preheader)}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f5f6f8; padding: 32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden;">
                <tr>
                  <td style="background: #172554; padding: 24px 32px;">
                    <p style="margin: 0; color: #f97316; font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;">DineOut NG</p>
                    <h1 style="margin: 8px 0 0; color: #ffffff; font-size: 24px; line-height: 1.25;">${escapeHtml(input.heading)}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 32px 18px;">
                    <p style="margin: 0 0 16px; color: #111827; font-size: 16px; line-height: 1.6;">Hi ${escapeHtml(input.greetingName)},</p>
                    <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.7;">${escapeHtml(input.intro)}</p>
                  </td>
                </tr>
                ${codeBlock}
                ${
                  input.body
                    ? `<tr><td style="padding: 0 32px 30px;"><p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.7;">${escapeHtml(input.body)}</p></td></tr>`
                    : ""
                }
                <tr>
                  <td style="padding: 22px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 8px; color: #4b5563; font-size: 13px; line-height: 1.6;">${escapeHtml(input.footerNote ?? "If you did not request this email, please ignore it or contact DineOutNG support.")}</p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">DineOutNG Operations Team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNaira(minor: number): string {
  const naira = minor / 100;
  return `₦${naira.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function renderOrderReceiptTemplate(input: SendOrderReceiptEmailInput): string {
  const shortOrderId = input.masterOrderId.slice(0, 8).toUpperCase();
  const preheader = `Payment receipt for order #${shortOrderId} · Total ${formatNaira(input.totals.totalMinor)}`;

  const groupsHtml = input.groups
    .map(
      (group) => `
        <div style="margin-bottom: 16px; padding: 14px 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px;">
          <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="font-weight: 700; font-size: 14px; color: #111827;">${escapeHtml(group.outletName)}</td>
                <td align="right" style="font-weight: 600; font-size: 13px; color: #4b5563;">${formatNaira(group.subtotalMinor)}</td>
              </tr>
            </table>
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${group.items
              .map(
                (item) => `
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #374151; vertical-align: top;">
                    <strong>${item.quantity > 1 ? `${item.quantity}x ` : ""}${escapeHtml(item.name)}</strong>
                    ${item.notes ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Note: ${escapeHtml(item.notes)}</div>` : ""}
                  </td>
                  <td align="right" style="padding: 4px 0; font-size: 13px; font-weight: 500; color: #111827; vertical-align: top; white-space: nowrap;">
                    ${formatNaira(item.totalPriceMinor)}
                  </td>
                </tr>
              `,
              )
              .join("")}
          </table>
        </div>
      `,
    )
    .join("");

  const feeRows: string[] = [
    `<tr>
      <td style="padding: 5px 0; color: #4b5563; font-size: 14px;">Subtotal</td>
      <td align="right" style="padding: 5px 0; font-weight: 600; font-size: 14px; color: #111827;">${formatNaira(input.totals.subtotalMinor)}</td>
    </tr>`,
    `<tr>
      <td style="padding: 5px 0; color: #4b5563; font-size: 14px;">Delivery fee</td>
      <td align="right" style="padding: 5px 0; font-weight: 600; font-size: 14px; color: #111827;">${input.totals.deliveryFeeMinor === 0 ? "Free" : formatNaira(input.totals.deliveryFeeMinor)}</td>
    </tr>`,
  ];

  if (input.totals.vatMinor > 0) {
    feeRows.push(`
      <tr>
        <td style="padding: 5px 0; color: #6b7280; font-size: 13px;">VAT (7.5%)</td>
        <td align="right" style="padding: 5px 0; font-size: 13px; color: #6b7280;">${formatNaira(input.totals.vatMinor)}</td>
      </tr>
    `);
  }

  if (input.totals.platformCommissionMinor && input.totals.platformCommissionMinor > 0) {
    feeRows.push(`
      <tr>
        <td style="padding: 5px 0; color: #6b7280; font-size: 13px;">Platform commission</td>
        <td align="right" style="padding: 5px 0; font-size: 13px; color: #6b7280;">${formatNaira(input.totals.platformCommissionMinor)}</td>
      </tr>
    `);
  }

  if (input.totals.serviceFeeMinor && input.totals.serviceFeeMinor > 0) {
    feeRows.push(`
      <tr>
        <td style="padding: 5px 0; color: #6b7280; font-size: 13px;">Service fee</td>
        <td align="right" style="padding: 5px 0; font-size: 13px; color: #6b7280;">${formatNaira(input.totals.serviceFeeMinor)}</td>
      </tr>
    `);
  }

  if (input.totals.discountMinor && input.totals.discountMinor > 0) {
    feeRows.push(`
      <tr>
        <td style="padding: 5px 0; color: #16a34a; font-size: 14px; font-weight: 600;">Promo discount</td>
        <td align="right" style="padding: 5px 0; color: #16a34a; font-size: 14px; font-weight: 600;">-${formatNaira(input.totals.discountMinor)}</td>
      </tr>
    `);
  }

  const fulfillmentModeLabel = input.deliveryMode === "TAKEOUT" ? "Takeout" : "Delivery";

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Payment Receipt - Order #${shortOrderId}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #f5f6f8; font-family: Arial, Helvetica, sans-serif; color: #111827;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(preheader)}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f5f6f8; padding: 32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 580px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; text-align: left;">
                <!-- Brand Header -->
                <tr>
                  <td style="background: #172554; padding: 24px 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <p style="margin: 0; color: #f97316; font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;">DineOut NG</p>
                          <h1 style="margin: 6px 0 0; color: #ffffff; font-size: 22px; line-height: 1.25;">Payment Receipt</h1>
                        </td>
                        <td align="right">
                          <span style="display: inline-block; background: rgba(255, 255, 255, 0.12); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 6px 12px; font-size: 13px; font-weight: 700; font-family: monospace;">
                            #${shortOrderId}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Greeting & Intro -->
                <tr>
                  <td style="padding: 24px 32px 16px;">
                    <p style="margin: 0 0 8px; color: #111827; font-size: 16px; font-weight: 600;">Hi ${escapeHtml(input.customerName)},</p>
                    <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                      Your payment of <strong style="color: #111827;">${formatNaira(input.totals.totalMinor)}</strong> was successfully received. Kitchens have received your order.
                    </p>
                  </td>
                </tr>

                <!-- Kitchen Groups (Same as checkout) -->
                <tr>
                  <td style="padding: 8px 32px 12px;">
                    <p style="margin: 0 0 10px; color: #6b7280; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">Kitchen Breakdown</p>
                    ${groupsHtml}
                  </td>
                </tr>

                <!-- Summary Totals (Same as checkout summary) -->
                <tr>
                  <td style="padding: 12px 32px 20px;">
                    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 20px;">
                      <p style="margin: 0 0 12px; color: #6b7280; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">Order Summary</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        ${feeRows.join("")}
                        <tr>
                          <td style="padding: 12px 0 0; border-top: 2px solid #e5e7eb; font-size: 15px; font-weight: 700; color: #111827;">Total Paid</td>
                          <td align="right" style="padding: 12px 0 0; border-top: 2px solid #e5e7eb; font-size: 17px; font-weight: 800; color: #f97316;">${formatNaira(input.totals.totalMinor)}</td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>

                <!-- Payment & Delivery Details -->
                <tr>
                  <td style="padding: 0 32px 24px;">
                    <div style="background: #f9fafb; border-radius: 12px; padding: 14px 18px; font-size: 12px; line-height: 1.6; color: #4b5563;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding: 2px 0; color: #6b7280;">Payment Reference:</td>
                          <td align="right" style="padding: 2px 0; font-family: monospace; font-weight: 600; color: #111827;">${escapeHtml(input.paymentReference)}</td>
                        </tr>
                        <tr>
                          <td style="padding: 2px 0; color: #6b7280;">Gateway:</td>
                          <td align="right" style="padding: 2px 0; font-weight: 600; color: #111827;">${escapeHtml(input.paymentGateway.toUpperCase())}</td>
                        </tr>
                        <tr>
                          <td style="padding: 2px 0; color: #6b7280;">Fulfillment:</td>
                          <td align="right" style="padding: 2px 0; font-weight: 600; color: #111827;">${fulfillmentModeLabel}</td>
                        </tr>
                        ${
                          input.deliveryAddress
                            ? `
                          <tr>
                            <td style="padding: 2px 0; color: #6b7280; vertical-align: top;">Delivery Address:</td>
                            <td align="right" style="padding: 2px 0; font-weight: 500; color: #111827; max-width: 250px;">${escapeHtml(input.deliveryAddress)}</td>
                          </tr>
                        `
                            : ""
                        }
                        ${
                          input.recipientPhone
                            ? `
                          <tr>
                            <td style="padding: 2px 0; color: #6b7280;">Recipient Phone:</td>
                            <td align="right" style="padding: 2px 0; font-weight: 500; color: #111827;">${escapeHtml(input.recipientPhone)}</td>
                          </tr>
                        `
                            : ""
                        }
                      </table>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 6px; color: #4b5563; font-size: 13px; line-height: 1.5;">
                      Track your order live anytime in your DineOut NG account.
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">DineOutNG Operations Team · support@dineout.ng</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
