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
                    <p style="margin: 0; color: #f97316; font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;">RSC</p>
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
                    <p style="margin: 0 0 8px; color: #4b5563; font-size: 13px; line-height: 1.6;">${escapeHtml(input.footerNote ?? "If you did not request this email, please ignore it or contact RSC support.")}</p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">RSC Operations Team</p>
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
