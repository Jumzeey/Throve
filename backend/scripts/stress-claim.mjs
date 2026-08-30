#!/usr/bin/env node
/**
 * Concurrent claim stress test against Express /live claim RPC.
 *
 * Usage:
 *   API_URL=http://localhost:4000 \
 *   ACCESS_TOKEN=<supabase jwt> \
 *   SESSION_ID=<uuid> \
 *   PRODUCT_ID=<uuid> \
 *   CONCURRENCY=50 \
 *   node backend/scripts/stress-claim.mjs
 *
 * Expectation: with stock=M, at most M successful claims; rest OUT_OF_STOCK.
 */
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const TOKEN = process.env.ACCESS_TOKEN;
const SESSION_ID = process.env.SESSION_ID;
const PRODUCT_ID = process.env.PRODUCT_ID;
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 50);

if (!TOKEN || !SESSION_ID || !PRODUCT_ID) {
  console.error('Required: ACCESS_TOKEN, SESSION_ID, PRODUCT_ID');
  process.exit(1);
}

async function claim(i) {
  const res = await fetch(`${API_URL}/live/sessions/${SESSION_ID}/products/${PRODUCT_ID}/claim`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ quantity: 1 }),
  });
  const body = await res.json().catch(() => ({}));
  return { i, status: res.status, body };
}

const started = Date.now();
const results = await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => claim(i)));
const ok = results.filter((r) => r.status >= 200 && r.status < 300);
const out = results.filter((r) => r.status === 409 || r.body?.code === 'OUT_OF_STOCK');
const other = results.filter((r) => !ok.includes(r) && !out.includes(r));

console.log(
  JSON.stringify(
    {
      concurrency: CONCURRENCY,
      ms: Date.now() - started,
      success: ok.length,
      outOfStock: out.length,
      other: other.length,
      otherSamples: other.slice(0, 5),
    },
    null,
    2,
  ),
);

if (ok.length > Number(process.env.EXPECTED_STOCK ?? ok.length)) {
  console.error('FAIL: more successful claims than expected stock');
  process.exit(2);
}

console.log('OK');
