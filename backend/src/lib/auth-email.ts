type AuthEmailKind = 'magiclink' | 'signup' | 'recovery';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function brandedEmail(input: {
  title: string;
  body: string;
  ctaLabel: string;
  actionLink: string;
  footnote?: string;
}) {
  const link = escapeHtml(input.actionLink);
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
          <tr>
            <td align="center" style="padding:0 32px 28px;">
              <a href="${link}" target="_blank" style="display:inline-block;padding:15px 32px;font-size:15px;font-weight:600;color:#FFF7F0;text-decoration:none;border-radius:26px;background-color:#5A1F45;">
                ${escapeHtml(input.ctaLabel)}
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
          </tr>
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

export function buildAuthEmail(kind: AuthEmailKind, actionLink: string, email: string) {
  if (kind === 'signup') {
    return {
      subject: 'Confirm your Throve account',
      html: brandedEmail({
        title: 'Confirm your email',
        body: 'Welcome to Throve. Tap the button below to verify your email and finish creating your account.',
        footnote: 'This link expires shortly and can only be used once.',
        ctaLabel: 'Confirm email address',
        actionLink,
      }),
      text: `Confirm your Throve account\n\nOpen this link to finish signup:\n${actionLink}`,
    };
  }

  if (kind === 'recovery') {
    return {
      subject: 'Recover your Throve account',
      html: brandedEmail({
        title: 'Account recovery',
        body: `We received a recovery request for <strong style="color:#2B211F;">${escapeHtml(email)}</strong>.`,
        footnote: 'Tap the button below to continue. If you did not request this, you can ignore this email.',
        ctaLabel: 'Continue recovery',
        actionLink,
      }),
      text: `Recover your Throve account\n\nOpen this link to continue:\n${actionLink}`,
    };
  }

  return {
    subject: 'Your Throve sign-in link',
    html: brandedEmail({
      title: 'Your sign-in link',
      body: 'Tap the button below to sign in to Throve. This link expires shortly and can only be used once.',
      footnote: 'If you did not request this email, you can safely ignore it.',
      ctaLabel: 'Sign in to Throve',
      actionLink,
    }),
    text: `Your Throve sign-in link\n\nOpen this link to sign in:\n${actionLink}`,
  };
}
