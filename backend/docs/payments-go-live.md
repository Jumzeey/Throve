# Payments go-live checklist

Throve runs in `PAYMENT_MODE=simulate` until the Flutterwave keys are available. In simulate mode, every
checkout, payout, refund and bank verification runs through the same code paths as live mode. The simulate
provider (`backend/src/lib/payments/simulate.ts`) returns successful results with `SIM-…` references.

Switching to live mode means setting env vars, filling in the Flutterwave provider stubs and running the tests
below. No route, schema or app changes are needed.

## 1. Environment (Railway)

| Variable | Value |
| --- | --- |
| `PAYMENT_MODE` | `flutterwave` |
| `FLW_SECRET_KEY` | Flutterwave secret key (test key first, then live) |
| `FLW_PUBLIC_KEY` | Flutterwave public key |
| `FLW_SECRET_HASH` | Dashboard → Settings → Webhooks → Secret hash |
| `PAYMENT_REDIRECT_URL` | `throveapp://checkout/payment-return` |
| `ENABLE_JOBS` | `true` |
| `ALLOW_DIRECT_COMPLETE` | **unset** (it has no effect outside simulate mode, but remove it anyway) |

`paymentMode()` only returns `flutterwave` when `PAYMENT_MODE=flutterwave` **and** `FLW_SECRET_KEY` is set.
If either is missing, it quietly falls back to simulate. After deploying, check the logs and `GET /payout-account` (its `mode`
field) to confirm the mode.

## 2. Flutterwave dashboard

- Webhook URL: `https://<api-host>/checkout/payments/webhook`
- Secret hash: must match `FLW_SECRET_HASH`. Flutterwave sends it in the `verif-hash` header.
- Enable transfers (payouts) on the account and fund the NGN transfer balance.
- Whitelist the Railway egress IPs if Flutterwave asks for them for transfers.

## 3. Fill in the provider stubs

`backend/src/lib/payments/flutterwave.ts` → `flutterwaveProvider`. Each method currently throws
`not configured`:

| Method | Endpoint | Maps to |
| --- | --- | --- |
| `listBanks` | `GET /banks/NG` | `{ code, name }[]` |
| `resolveAccount` | `POST /accounts/resolve` | `account_name` |
| `createRecipient` | `POST /beneficiaries` | beneficiary `id` → `provider_recipient_id` |
| `transfer` | `POST /transfers` (`reference` = payout id) | `NEW`/`PENDING` → `pending`, `SUCCESSFUL` → `successful`, `FAILED` → `failed` |
| `transferStatus` | `GET /transfers/:id` | same mapping |
| `refund` | `POST /transactions/:id/refund` (`:id` = payment intent `provider_ref`) | refund `id` → `provider_ref` |
| `refundStatus` | `GET /refunds/:id` | `completed` → `successful`, `failed` → `failed`, else `pending` |

The rest is already wired:

- Admin payout execute/retry calls `transfer`. Results are applied by `applyPayoutOutcome` in
  `backend/src/lib/payments/settle.ts`.
- Admin refund execute/retry calls `refund`, and results go through `applyRefundOutcome`.
- `POST /admin/payouts/:id/verify` and `POST /admin/refunds/:id/verify` re-check status by `provider_ref`.
- The scheduler (`backend/src/jobs/scheduler.ts`) runs every 5 minutes. It reconciles `processing` payouts and
  refunds, auto-completes delivered orders that are past `auto_complete_at`, and cancels pending payment intents older than
  1 hour. It uses the `claim_job_lease` RPC, so only one instance runs it at a time.

Optional: have the transfer webhook (`event: transfer.completed`) call `applyPayoutOutcome` directly, so sellers
don't have to wait up to 5 minutes for reconciliation.

## 4. Test with Flutterwave test keys

Run these against a staging deploy with test keys before switching to live keys:

1. **Card payment**: buy an item in the app. Confirm the Flutterwave checkout opens, the app returns through
   `throveapp://checkout/payment-return`, the webhook marks the intent `successful`, and the order is `paid`.
2. **Bank verification**: as a seller, open Settings → Payout account and verify a test account. It should save
   with `provider=flutterwave` and a real `provider_recipient_id`.
3. **Payout**: complete an order, then execute the payout in the admin console. It should go to `processing` with a
   Flutterwave `provider_ref`, then `paid_out` after the next reconcile or a "Check provider status" click.
4. **Refund**: open and resolve a dispute that needs a refund, then execute it in the admin console. It should end
   `completed` with a Flutterwave refund reference.
5. **Failure path**: send a transfer to a Flutterwave test failure account. The payout should end up `failed`, and the Retry
   button should work.

## 5. Re-verify simulate-mode sellers

Accounts verified in simulate mode have `seller_payout_accounts.provider = 'simulate'` and no real recipient.
Once live, the admin execute route refuses to pay these sellers ("Seller has no verified live payout account").
The app also shows a re-verify banner on the payout account screen (`needsReverify`).

Before the first live payout, either:

- ask the affected sellers to re-open Settings → Payout account and verify again, or
- run a one-off script that calls `resolveAccount` + `createRecipient` for each `provider='simulate'` row and
  updates `provider`, `provider_recipient_id`, `account_name` and `verified_at`.

Find the affected sellers with:

```sql
select seller_id, bank_name, account_number_last4
from seller_payout_accounts
where status = 'verified' and provider = 'simulate';
```

## 6. Mobile app

The Flutterwave redirect goes back into the app through the `throveapp://` scheme. This needs a real native build
(the EAS `preview` or `production` profile). Expo Go and OTA updates alone won't register the scheme on a device that
doesn't already have it. See `frontend/docs/eas-update.md`.

## 7. Rollback

Set `PAYMENT_MODE=simulate` (or unset `FLW_SECRET_KEY`) and redeploy. Anything already `processing` with a
Flutterwave `provider_ref` keeps reconciling through the Flutterwave provider, because `providerForRef` routes by
reference rather than by the current mode. Those checks need `FLW_SECRET_KEY` to stay set.
