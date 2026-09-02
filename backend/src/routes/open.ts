import { Router } from 'express';
import { escapeHtml } from '../lib/email/layout.js';

const router = Router();

const ALLOWED_PREFIXES = [
  'auth/',
  'inbox/',
  'checkout/',
  'product/',
  'live/',
  'profile/',
  'sell/',
  'seller/',
];

function isAllowedAppPath(pathWithQuery: string) {
  const pathOnly = pathWithQuery.split('?')[0] ?? '';
  return ALLOWED_PREFIXES.some((prefix) => pathOnly === prefix.slice(0, -1) || pathOnly.startsWith(prefix));
}

/**
 * HTTPS bridge for email CTAs. Gmail and most clients strip custom schemes
 * like throveapp:// from hrefs. This page is a real https link that then
 * hands off to the app.
 *
 * Example: /open/inbox/offer/abc → throveapp://inbox/offer/abc
 */
router.use((req, res) => {
  const raw = (req.originalUrl || req.url || '').replace(/^\/open\/?/, '');
  const decoded = decodeURIComponent(raw.split('#')[0] ?? '').replace(/^\/+/, '');

  if (!decoded || decoded.includes('..') || !isAllowedAppPath(decoded)) {
    res.status(400).type('html').send(`<!DOCTYPE html>
<html lang="en"><body style="font-family:system-ui;padding:32px;background:#F3EDE6;color:#2B211F;">
  <p>This Throve link is invalid or expired.</p>
  <p><a href="https://throve.store">throve.store</a></p>
</body></html>`);
    return;
  }

  const deepLink = `throveapp://${decoded}`;
  const safeHref = escapeHtml(deepLink);
  const safeJson = JSON.stringify(deepLink);

  res
    .status(200)
    .type('html')
    .set('Cache-Control', 'no-store')
    .send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0;url=${safeHref}" />
  <title>Opening Throve…</title>
</head>
<body style="margin:0;padding:32px 16px;background:#F3EDE6;font-family:Inter,Helvetica,Arial,sans-serif;color:#2B211F;text-align:center;">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#5A1F45;margin-bottom:16px;">throve</div>
  <p style="margin:0 0 20px;font-size:15px;color:#5C4B45;">Opening the Throve app…</p>
  <p style="margin:0 0 12px;">
    <a href="${safeHref}" style="display:inline-block;padding:14px 28px;background:#5A1F45;color:#FFF7F0;text-decoration:none;border-radius:26px;font-weight:600;">
      Open in Throve
    </a>
  </p>
  <p style="font-size:12px;color:#8C7A73;word-break:break-all;">${safeHref}</p>
  <script>window.location.href = ${safeJson};</script>
</body>
</html>`);
});

export default router;
