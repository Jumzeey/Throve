type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

/** Send a transactional email via Mailjet's REST API (not Supabase SMTP). */
export async function sendMailjetEmail(input: SendEmailInput) {
  const apiKey = requireEnv('MAILJET_API_KEY');
  const secretKey = requireEnv('MAILJET_SECRET_KEY');
  const fromEmail = process.env.MAILJET_FROM_EMAIL?.trim() || 'noreply@throve.store';
  const fromName = process.env.MAILJET_FROM_NAME?.trim() || 'Throve';

  const auth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: fromEmail, Name: fromName },
          To: [{ Email: input.to }],
          Subject: input.subject,
          HTMLPart: input.html,
          TextPart: input.text,
        },
      ],
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    Messages?: Array<{ Status?: string; Errors?: Array<{ ErrorMessage?: string }> }>;
    ErrorMessage?: string;
    ErrorCode?: string | number;
  };

  if (!response.ok) {
    const detail =
      payload.ErrorMessage ||
      payload.Messages?.[0]?.Errors?.[0]?.ErrorMessage ||
      `Mailjet HTTP ${response.status}`;
    throw new Error(detail);
  }

  const status = payload.Messages?.[0]?.Status;
  if (status && status !== 'success') {
    const detail = payload.Messages?.[0]?.Errors?.[0]?.ErrorMessage || `Mailjet status: ${status}`;
    throw new Error(detail);
  }
}
