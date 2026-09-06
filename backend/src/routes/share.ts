import { Router } from 'express';
import { escapeHtml, formatNaira } from '../lib/email/layout.js';
import { createServiceClient } from '../lib/supabase.js';

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function publicApiBase() {
  const raw =
    process.env.PUBLIC_API_URL?.trim() ||
    process.env.API_PUBLIC_URL?.trim() ||
    'https://throve-production.up.railway.app';
  return raw.replace(/\/$/, '');
}

function absoluteHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

/**
 * Public product share page for WhatsApp / iMessage / etc.
 * Serves Open Graph meta so messengers show a rich preview card, then deep-links into the app.
 *
 * Example: /share/product/:id
 */
router.get('/product/:id', async (req, res) => {
  const id = String(req.params.id ?? '').trim();
  if (!UUID_RE.test(id)) {
    res.status(400).type('html').send(simplePage('This Throve link is invalid.', null));
    return;
  }

  const admin = createServiceClient();
  const { data: listing, error } = await admin
    .from('listings')
    .select('id, title, price, description, brand, condition, status, photo_urls, seller_id')
    .eq('id', id)
    .maybeSingle();

  if (error || !listing || listing.status === 'draft' || listing.status === 'removed') {
    res.status(404).type('html').send(simplePage('This listing is no longer available on Throve.', null));
    return;
  }

  let seller = 'a Throve seller';
  if (listing.seller_id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('username')
      .eq('id', listing.seller_id)
      .maybeSingle();
    if (profile?.username) seller = `@${profile.username}`;
  }

  const title = String(listing.title ?? 'Listing on Throve').trim() || 'Listing on Throve';
  const price = formatNaira(Number(listing.price) || 0);
  const brand = String(listing.brand ?? '').trim();
  const condition = String(listing.condition ?? '').trim();
  const descRaw = String(listing.description ?? '').trim();
  const metaBits = [brand, condition, `Sold by ${seller}`].filter(Boolean);
  const description =
    (descRaw || metaBits.join(' · ') || `${title} on Throve`).slice(0, 200) +
    (descRaw.length > 200 ? '…' : '');

  const photos = Array.isArray(listing.photo_urls) ? listing.photo_urls : [];
  const image = photos.map(absoluteHttpUrl).find(Boolean) ?? null;

  const shareUrl = `${publicApiBase()}/share/product/${id}`;
  const deepLink = `throveapp://product/${id}`;
  const pageTitle = `${title} · ${price}`;
  const ogTitle = `${title} · ${price} on Throve`;

  const imageMeta = image
    ? `
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />`
    : '';

  const imageBlock = image
    ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />`
    : `<div style="aspect-ratio:1;background:#EDE4DC;display:flex;align-items:center;justify-content:center;color:#8C7A73;font-family:Georgia,serif;font-size:28px;">throve</div>`;

  res
    .status(200)
    .type('html')
    .set('Cache-Control', 'public, max-age=300')
    .send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Throve" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />${imageMeta}

  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />

  <meta http-equiv="refresh" content="0;url=${escapeHtml(deepLink)}" />
  <link rel="canonical" href="${escapeHtml(shareUrl)}" />
  <style>
    body{margin:0;padding:32px 16px;background:#F3EDE6;font-family:Inter,Helvetica,Arial,sans-serif;color:#2B211F;text-align:center}
    .brand{font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#5A1F45;margin-bottom:16px}
    .card{max-width:420px;margin:0 auto;background:#FFF7F0;border:1px solid #E8DDD4;border-radius:14px;overflow:hidden;text-align:left}
    .card img{display:block;width:100%;aspect-ratio:1;object-fit:cover;background:#EDE4DC}
    .pad{padding:16px}
    h1{margin:0 0 8px;font-size:18px;line-height:1.3}
    .price{margin:0 0 8px;font-size:20px;font-weight:700;color:#5A1F45}
    .meta{margin:0;font-size:13px;color:#5C4B45;line-height:1.45}
    .cta{display:inline-block;margin-top:20px;padding:14px 28px;background:#5A1F45;color:#FFF7F0;text-decoration:none;border-radius:26px;font-weight:600}
    .hint{margin-top:14px;font-size:12px;color:#8C7A73}
  </style>
</head>
<body>
  <div class="brand">throve</div>
  <div class="card">
    ${imageBlock}
    <div class="pad">
      <h1>${escapeHtml(title)}</h1>
      <p class="price">${escapeHtml(price)}</p>
      <p class="meta">${escapeHtml(description)}</p>
    </div>
  </div>
  <p>
    <a class="cta" href="${escapeHtml(deepLink)}">Open in Throve</a>
  </p>
  <p class="hint">If the app doesn’t open, install Throve and tap the button again.</p>
  <script>window.location.href = ${JSON.stringify(deepLink)};</script>
</body>
</html>`);
});

function simplePage(message: string, deepLink: string | null) {
  const link = deepLink
    ? `<p><a href="${escapeHtml(deepLink)}" style="color:#5A1F45;">Open Throve</a></p>`
    : `<p><a href="https://throve.store" style="color:#5A1F45;">throve.store</a></p>`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Throve</title></head>
<body style="font-family:system-ui;padding:32px;background:#F3EDE6;color:#2B211F;text-align:center;">
  <div style="font-family:Georgia,serif;font-size:28px;color:#5A1F45;margin-bottom:16px;">throve</div>
  <p>${escapeHtml(message)}</p>
  ${link}
</body></html>`;
}

export default router;
