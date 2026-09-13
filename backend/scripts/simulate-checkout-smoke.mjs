/**
 * Smoke: simulated payment init → verify → order (paid).
 *
 * Usage (from repo root, with backend/.env + a buyer access token):
 *   ACCESS_TOKEN=... LISTING_ID=... npm run -w backend simulate-checkout-smoke
 *
 * Or:
 *   node --import tsx backend/scripts/simulate-checkout-smoke.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

const API_URL = (process.env.API_URL || process.env.PUBLIC_API_URL || 'https://throve-production.up.railway.app').replace(
  /\/$/,
  '',
);
const TOKEN = process.env.ACCESS_TOKEN;
const LISTING_ID = process.env.LISTING_ID;

function fail(msg) {
  console.error('FAIL', msg);
  process.exit(1);
}

async function api(method, pathName, body) {
  const res = await fetch(`${API_URL}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  if (!TOKEN) fail('Set ACCESS_TOKEN (buyer JWT)');
  if (!LISTING_ID) fail('Set LISTING_ID (available listing owned by another user)');

  const config = await api('GET', '/checkout/payments/config');
  console.log('config', config.status, config.json);
  if (config.json?.mode !== 'simulate') {
    fail(`Expected payment mode simulate, got ${config.json?.mode}. Set PAYMENT_MODE=simulate on the backend.`);
  }

  const init = await api('POST', '/checkout/payments/init', {
    listingId: LISTING_ID,
    name: 'Smoke Buyer',
    address: '12 Test Street',
    city: 'Lagos',
    state: 'Lagos',
    phone: '08012345678',
    deliveryMethod: 'Standard',
    offerId: null,
    liveSessionId: null,
    liveStreamProductId: null,
    claimId: null,
  });
  console.log('init', init.status, { mode: init.json?.mode, txRef: init.json?.txRef });
  if (init.status !== 201 && init.status !== 200) fail(init.json?.message || `init ${init.status}`);
  if (init.json?.mode !== 'simulate') fail(`init mode was ${init.json?.mode}`);
  const txRef = init.json?.txRef;
  if (!txRef) fail('missing txRef');

  const verify = await api('POST', '/checkout/payments/verify', {
    txRef,
    simulateOutcome: 'success',
  });
  console.log('verify', verify.status, {
    status: verify.json?.status,
    orderId: verify.json?.order?.id,
    orderStatus: verify.json?.order?.status,
  });
  if (verify.status !== 200) fail(verify.json?.message || `verify ${verify.status}`);
  if (verify.json?.status !== 'successful') fail(`verify status ${verify.json?.status}`);
  if (!verify.json?.order?.id) fail('missing order');
  if (verify.json.order.status !== 'paid') fail(`order status ${verify.json.order.status}`);

  const orders = await api('GET', '/checkout/orders');
  const found = (orders.json || []).find((o) => o.id === verify.json.order.id);
  console.log('orders.contains', Boolean(found), found?.status);
  if (!found) fail('order not in GET /checkout/orders');

  console.log('PASS simulate → successful → paid order', verify.json.order.id);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
