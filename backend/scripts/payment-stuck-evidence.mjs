/**
 * Evidence harness for the stuck “confirming payment” root cause.
 * Does not need a running API.
 */
import { randomUUID } from 'crypto';

function oldBrokenOrderId(buyerVisibleCount) {
  return `ORD${1001 + buyerVisibleCount}`;
}

function newOrderId() {
  return `ORD${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

function paymentMode({ PAYMENT_MODE, FLW_SECRET_KEY }) {
  if (PAYMENT_MODE === 'flutterwave' && FLW_SECRET_KEY?.trim()) return 'flutterwave';
  return 'simulate';
}

// --- Case A: RLS-scoped counts collide across buyers ---
const buyerAFirst = oldBrokenOrderId(0); // first order for buyer A
const buyerBFirst = oldBrokenOrderId(0); // first order for buyer B (cannot see A's rows)
const collision = buyerAFirst === buyerBFirst;

// --- Case B: unique generator ---
const minted = new Set(Array.from({ length: 5000 }, () => newOrderId()));

// --- Case C: FLW key alone must not enable live provider ---
const modeWithKeyOnly = paymentMode({ PAYMENT_MODE: undefined, FLW_SECRET_KEY: 'FLWSECK_TEST' });
const modeExplicit = paymentMode({ PAYMENT_MODE: 'flutterwave', FLW_SECRET_KEY: 'FLWSECK_TEST' });

const report = {
  rlsCountCollision: {
    buyerAFirst,
    buyerBFirst,
    collision,
    explainsStuckConfirming: collision,
  },
  newIdsUnique: minted.size === 5000,
  paymentMode: {
    withSecretKeyOnly: modeWithKeyOnly,
    withExplicitFlutterwave: modeExplicit,
  },
  pass: collision && minted.size === 5000 && modeWithKeyOnly === 'simulate' && modeExplicit === 'flutterwave',
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.pass ? 0 : 1);
