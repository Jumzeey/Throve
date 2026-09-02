export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function formatNaira(amount: number) {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

export function truncateSubject(value: string, max = 48) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export type BrandedEmailInput = {
  title: string;
  body: string;
  ctaLabel?: string;
  actionLink?: string;
  footnote?: string;
};

/** Premium Editorial HTML shell used by all Throve transactional emails. */
export function brandedEmail(input: BrandedEmailInput) {
  const hasCta = Boolean(input.ctaLabel && input.actionLink);
  const link = input.actionLink ? escapeHtml(input.actionLink) : '';

  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background-color:#F3EDE6;font-family:Inter,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F3EDE6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#FFF7F0;border:1px solid #E2D7CC;border-radius:16px;overflow:hidden;">
          <tr>
            <td align="center" style="padding:32px 32px 8px;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1;color:#5A1F45;letter-spacing:-0.3px;">throve</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:400;color:#2B211F;">${escapeHtml(input.title)}</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#5C4B45;">${input.body}</p>
              ${input.footnote ? `<p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#7A6A64;">${input.footnote}</p>` : ''}
            </td>
          </tr>
          ${
            hasCta
              ? `<tr>
            <td align="center" style="padding:0 32px 28px;">
              <a href="${link}" target="_blank" style="display:inline-block;padding:15px 32px;font-size:15px;font-weight:600;color:#FFF7F0;text-decoration:none;border-radius:26px;background-color:#5A1F45;">
                ${escapeHtml(input.ctaLabel!)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#8C7A73;">Button not working? Copy and paste this link:</p>
              <p style="margin:8px 0 0;font-size:12px;line-height:1.6;word-break:break-all;">
                <a href="${link}" style="color:#5A1F45;text-decoration:underline;">${link}</a>
              </p>
            </td>
          </tr>`
              : ''
          }
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #EDE3D9;background-color:#FFFCF8;">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#A2938B;text-align:center;">
                Throve · Buy and sell preloved fashion<br />
                throve.store
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

export function buildEmail(input: {
  subject: string;
  title: string;
  bodyHtml: string;
  bodyText: string;
  ctaLabel?: string;
  actionLink?: string;
  footnote?: string;
}): EmailContent {
  return {
    subject: input.subject,
    html: brandedEmail({
      title: input.title,
      body: input.bodyHtml,
      ctaLabel: input.ctaLabel,
      actionLink: input.actionLink,
      footnote: input.footnote,
    }),
    text: [
      input.subject,
      '',
      input.bodyText,
      input.footnote ? `\n${input.footnote}` : '',
      input.actionLink ? `\n${input.actionLink}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
