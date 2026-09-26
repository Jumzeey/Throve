# Admin console API contract

Staff APIs for the Throve admin Vite app. Mounted on the Express backend under `/admin/...`.
Staff auth lives under `/auth/staff/*` (already live).

**Keep RBAC in sync:** `backend/src/lib/staff-rbac.ts` ↔ `admin/src/lib/roles.ts`.

---

## Auth

Every `/admin/*` route uses `requireStaffAuth` (Bearer access token → staff profile with `admin_role` + `admin_active`).

Mutations also use:

- `requireStaffRole(...roles)` — allow-list of roles, or
- `requireStaffAction(action)` — action key from `StaffAction` / `ACTION_ROLES`

Non-staff or inactive staff → `403` with `FORBIDDEN` or `ACCESS_REVOKED`.

Service role (`createServiceClient()`) is used for privileged reads/writes. Do not rely on end-user RLS for admin queues.

---

## List endpoints

```http
GET /admin/{resource}?queue=&q=&cursor=&limit=
```

**Response (target shape for new domains):**

```json
{
  "items": [],
  "nextCursor": null,
  "counts": {}
}
```

| Query | Notes |
|-------|--------|
| `queue` | Filter chip id (e.g. `pending`, `all`) |
| `q` | Free-text search |
| `cursor` | Opaque page token (`created_at,id`); omit for first page |
| `limit` | Default 25–50; hard cap 100 (listings currently uses 200 — tighten on new routes) |

**Note:** `GET /admin/listings` today returns `{ listings, counts, viewerRole }` for backward compatibility. New domains should use `items` + `nextCursor`. Listings can migrate in its completion plan.

---

## Detail

```http
GET /admin/{resource}/:id
→ { item: T }  or  T
```

Use when list rows are thin; otherwise the list row may carry enough for the inspector.

---

## Mutations

```http
POST /admin/{resource}/:id/{action}
Content-Type: application/json

{ "reason": "…", … }
```

**Response:** `{ item: T }` or the updated entity / `{ ok: true }`.

Rules:

1. Destructive, money, or enforcement actions **require** `reason` (trim, min length 3) — matches ConfirmActionDialog.
2. Call `writeAdminAudit(...)` after a successful mutation (failures log-only; do not roll back the action).
3. Money paths (refunds/payouts) must be **idempotent** — second execute → `ALREADY_APPLIED` or `CONFLICT`.

---

## Error envelope

```json
{ "message": "Human-readable", "code": "FORBIDDEN" }
```

| Code | Typical status | When |
|------|----------------|------|
| `FORBIDDEN` | 403 | Not staff / wrong role / action denied |
| `ACCESS_REVOKED` | 403 | `admin_active = false` |
| `UNAUTHORIZED` / `SESSION_EXPIRED` | 401 | Missing/invalid token (auth middleware) |
| `NOT_FOUND` | 404 | Resource missing |
| `CONFLICT` | 409 | Wrong state for action (e.g. not pending) |
| `VALIDATION` | 400 | Zod / missing reason |
| `ALREADY_APPLIED` | 409 | Idempotent money action already done |
| `DB_ERROR` | 400 | Supabase error surfaced via `handleSupabaseError` |

---

## Audit (`/admin/audit`)

Table: `public.admin_audit_log`  
Writer: `backend/src/lib/admin-audit.ts` → `writeAdminAudit`  
Reader: `backend/src/routes/admin-audit.ts` + `admin-audit-read.ts`

Action keys use dotted names, e.g. `listing.approve`, `listing.reject`, `dispute.decide`.  
Callers may pass `meta.previousState` / `meta.resultingState` / `meta.result` (`denied`).

### Visibility (server)

| Viewer | Scope |
|--------|--------|
| `super_admin` | all · `full` |
| `trust_safety` | user/listing/report/live_session/dispute/order · `full`; `payout.hold`/`release` · `status_only`; refund/payment/other payout · hidden |
| `finance` | refund/payout/payment_intent · `full`; `dispute.decide` · `outcome_only`; sensitivity `Access` · `full`; moderation · hidden |
| `support` | own `.note` / `.escalate` only · `full` |

### Endpoints

| Method | Path | RBAC | Query / body | Effect |
|--------|------|------|--------------|--------|
| `GET` | `/` | audit roles | `date`, `module`, `result`, `actorRole`, `q`, `limit` | `{ events, counts }` |
| `GET` | `/:id` | same | — | `{ event }` (404 if hidden) |

Read-only. Forbidden staff actions (`requireStaffAction` 403) write `Access` sensitivity rows with `meta.result=denied`.

Listing approve/reject also continue to write `listing_review_events`.

---

## Ops badges & Operations home (`/admin/ops`)

Role-aware aggregation for Sidebar badges and the Operations dashboard. No mutations. No new tables.

### Badge semantics (`GET /admin/ops/badges`)

| Key | Source |
|-----|--------|
| `listings` | `pending_review` (exact head count) |
| `reports` | chat + live reports in `open` / `under_review` |
| `live` | sessions with incident signal (escalated or open live reports) — recent window |
| `disputes` | `order_disputes` in `open` / `under_review` |
| `orders` | `needsAssistance` over last 300 orders (windowed) |
| `payments` | `needsAttentionUi` over last 300 intents (windowed) |
| `refunds` | `awaiting_finance` + `ready` |
| `payouts` | `eligible` |

All eight keys always returned. Values for routes the viewer cannot access (`canAccessRoute`) are **0**.

### Dashboard (`GET /admin/ops/dashboard`)

Query: `tab` (`urgent` \| `all` \| `evidence`), `q`.

Envelope: `{ badges, role, dashboard }` where `dashboard.kind` is `trust_safety` \| `finance` \| `support` \| `super_admin`.

- **T&S:** stats + merged priority queue (disputes / reports / live) + sensitive actions + workload
- **Finance:** eligible / on_hold / refunds / failed ops + amount sum
- **Support:** case stats + support rows
- **Super:** rollups + ban recommendations + sensitive actions

RBAC: `ROUTE_ROLES.operations` (all staff). `aiUnavailable: true` in v1.

---

## Listings (`/admin/listings`)

| Method | Path | RBAC | Body | Effect |
|--------|------|------|------|--------|
| `GET` | `/` | any staff | — | `{ listings, counts, viewerRole }` |
| `GET` | `/:id` | any staff | — | `{ listing, history }` from `listing_review_events` |
| `POST` | `/:id/approve` | `approve_listing` | `{ reason? }` optional ≥3 | status → `available`; event + audit `listing.approve` |
| `POST` | `/:id/reject` | `reject_listing` | `{ reason }` min 3 | status → `rejected`; event + audit `listing.reject` |
| `POST` | `/:id/hide` | `hide_listing` | `{ reason }` min 3 | status → `hidden`; event + audit `listing.hide` (High) |
| `POST` | `/:id/restore` | `restore_listing` | `{ reason }` min 3 | status → `available`; event + audit `listing.restore` |
| `POST` | `/:id/note` | listings route roles | `{ reason }` min 3 | event `note` + audit `listing.note` |
| `POST` | `/:id/escalate` | listings route roles | `{ reason }` min 3 | event `escalated` + audit `listing.escalate` (High) |

History event actions: `submitted`, `resubmitted`, `approved`, `rejected`, `hidden`, `restored`, `note`, `escalated`.

Mutation responses return `{ listing, history }` so the inspector can refresh without a second round-trip (UI still reloads detail after list refresh).

---

## Disputes (`/admin/disputes`)

| Method | Path | RBAC | Body | Effect |
|--------|------|------|------|--------|
| `GET` | `/` | disputes route roles (all staff) | `queue`, `q` | `{ disputes, counts }` |
| `GET` | `/:id` | same | — | `{ dispute }` with `history` + `timeline` |
| `POST` | `/:id/decide` | `decide_dispute` | `{ outcome, reason }` | status + decision columns; payout hold/release; event + audit `dispute.decide` (High) |
| `POST` | `/:id/note` | disputes route roles | `{ reason }` min 3 | event + audit `dispute.note` |
| `POST` | `/:id/escalate` | same | `{ reason }` min 3 | event + audit `dispute.escalate` (High); `open` → `under_review` |

`outcome`: `refund_buyer` \| `release_seller` \| `close`. Decide does **not** move money — Finance executes later. `refund_buyer` also inserts a `refunds` ledger row (idempotent on `dispute_id`).

---

## Refunds (`/admin/refunds`)

| Method | Path | RBAC | Body | Effect |
|--------|------|------|------|--------|
| `GET` | `/` | finance + super_admin | `queue`, `q` | `{ refunds, counts }` |
| `GET` | `/:id` | same | — | `{ refund }` with `history` |
| `POST` | `/:id/execute` | `execute_refund` | `{ reason, includeDelivery? }` | → processing; simulate/no intent → completed; audit High; idempotent `ALREADY_APPLIED` |
| `POST` | `/:id/retry` | `execute_refund` | `{ reason }` | From `failed` only |
| `POST` | `/:id/note` | refunds roles | `{ reason }` | event + audit `refund.note` |
| `POST` | `/:id/verify` | `execute_refund` | — | Ledger verify only (no Flutterwave); may set `uncertain` |

No live PSP refund in this version.

---

## Payouts (`/admin/payouts`)

| Method | Path | RBAC | Body | Effect |
|--------|------|------|------|--------|
| `GET` | `/` | finance + super_admin | `queue`, `q` | `{ payouts, counts }` (+ backfill from eligible orders) |
| `GET` | `/:id` | same | — | `{ payout }` with `history` |
| `POST` | `/:id/execute` | `execute_payout` | `{ reason }` | eligible only → processing → paid_out (simulate); mirrors `orders.payout_status`; idempotent `ALREADY_APPLIED` |
| `POST` | `/:id/retry` | `execute_payout` | `{ reason }` | From `failed` |
| `POST` | `/:id/hold` | `hold_payout` | `{ reason }` | → on_hold |
| `POST` | `/:id/release` | `hold_payout` | `{ reason }` | Staff hold → eligible/verification; blocked if open dispute |
| `POST` | `/:id/note` | payouts roles | `{ reason }` | event + audit |

Ledger synced via `ensurePayoutForOrder` on confirm-received, auto-complete, dispute open/decide. No live bank transfer yet.

---

## Payments (`/admin/payments`)

| Method | Path | RBAC | Body | Effect |
|--------|------|------|------|--------|
| `GET` | `/` | finance + super_admin | `queue`, `q` | `{ payments, counts }` over `payment_intents` (derived queues) |
| `GET` | `/:id` | same | — | `{ payment }` with `history` from `payment_events` |
| `POST` | `/:id/note` | payments roles | `{ reason }` | event + audit `payment.note` |
| `POST` | `/:id/reconcile` | `reconcile_payment` | `{ reason }` | Re-verify provider (Flutterwave) or simulate fulfill; pending only; idempotent `ALREADY_APPLIED` |

Queues (derived, not DB enums): `needs_attention` · `uncertain` · `failed` · `duplicate` · `successful`. No mark-as-paid without provider check. Refunds stay on Refunds module.

---

## Orders (`/admin/orders`)

| Method | Path | RBAC | Body | Effect |
|--------|------|------|------|--------|
| `GET` | `/` | all staff roles | `queue`, `q` | `{ orders, counts }` over `orders` (+ joins); derived `needs_assistance` |
| `GET` | `/:id` | same | — | `{ order }` with merged timeline |
| `POST` | `/:id/note` | orders roles | `{ reason }` | `order_events` + audit `order.note` |
| `POST` | `/:id/escalate` | orders roles | `{ reason }` | `order_events` escalated + audit `order.escalate` (High) |

Read-only lifecycle. No admin cancel/dispatch/complete. Money stays on Payments / Refunds / Payouts; disputes on Disputes.

---

## Users (`/admin/users`)

Account enforcement hub. Source: `profiles` + `user_events`. Self-service `deactivated` is separate from staff `account_status`.

### Status mapping

| Condition | UI status |
|-----------|-----------|
| `account_status = banned` | Banned |
| `account_status = suspended` | Suspended |
| `account_status = restricted` | Restricted |
| `deactivated = true` (and not banned/suspended) | Deactivated |
| else | Active |

### Endpoints

| Method | Path | RBAC | Body | Effect |
|--------|------|------|------|--------|
| `GET` | `/` | all staff | `filter`, `q` | `{ users, counts }` |
| `GET` | `/:id` | same | — | `{ user }` + history |
| `POST` | `/:id/note` | users roles | `{ reason }` | event + audit `user.note` |
| `POST` | `/:id/escalate` | users roles | `{ reason }` | event + audit `user.escalate` (High) |
| `POST` | `/:id/restrict` | `restrict_user` | `{ reason }` | → restricted; hide listings |
| `POST` | `/:id/unrestrict` | `restrict_user` | `{ reason }` | → active |
| `POST` | `/:id/suspend` | `suspend_user` | `{ reason, until? }` | → suspended; hide listings |
| `POST` | `/:id/unsuspend` | `suspend_user` | `{ reason }` | → active |
| `POST` | `/:id/recommend-ban` | `recommend_ban` | `{ reason }` | stores recommendation; **no** status change |
| `POST` | `/:id/ban` | `ban_user` (**super_admin only**) | `{ reason }` | → banned; hide listings |
| `POST` | `/:id/unban` | `ban_user` | `{ reason }` | → active |
| `POST` | `/:id/approve-host` | `approve_live_host` | `{ reason? }` | `can_host_live=true` |
| `POST` | `/:id/revoke-host` | `approve_live_host` | `{ reason }` | `can_host_live=false` |

Filters: `all` · `flagged` · `restricted` · `sellers` · `hosts` · `kyc` (seller + `!payout_verified`).

**Guards:** cannot enforce against profiles with `admin_role`. Idempotent mutations return `409 ALREADY_APPLIED`.

**Auth blocks:** `requireAuth` returns `403` `ACCOUNT_SUSPENDED` / `ACCOUNT_BANNED` for non-staff. Expired `suspended_until` auto-clears to active.

**Field masking:** API returns email + payout flags; Support UI hides email/history/payout. No phone/street/bank in DTO. KYC is derived from `payout_verified` until a real KYC store exists.

---

## Reports (`/admin/reports`)

Intake triage over `chat_reports` + `live_reports`. Composite ids: `chat:{uuid}` / `live:{uuid}`. Enforcement stays on Users / Listings / Live.

### Status mapping

| DB | UI |
|----|-----|
| `open` | New |
| `under_review` | Under review |
| `escalated` | Escalated |
| `action_taken` | Action taken |
| `dismissed` / `closed` | Closed |

### Queues

| Queue | Rule |
|-------|------|
| `open` | status in (`open`, `under_review`) |
| `high` | escalated OR linked count ≥ 2 |
| `repeat` | ≥2 reports same object key |
| `escalated` | status = escalated |
| `action_taken` | status = action_taken |
| `closed` | closed or dismissed |
| `assigned_me` | assignee = current staff |

Object keys: chat `user:{username}` · live listing `listing:{id}` · live session/user `live:{session}:{target|host}`.

### Endpoints

| Method | Path | RBAC | Body | Effect |
|--------|------|------|------|--------|
| `GET` | `/` | reports roles | `queue`, `q` | `{ reports, counts }` |
| `GET` | `/:id` | same | — | `{ report }` + history |
| `POST` | `/:id/note` | reports roles | `{ reason }` | event + audit |
| `POST` | `/:id/escalate` | reports roles | `{ reason }` | → escalated |
| `POST` | `/:id/assign` | reports roles | `{ assigneeId?, reason? }` | self-assign default; open → under_review |
| `POST` | `/:id/dismiss` | `dismiss_report` | `{ reason }` | → dismissed |
| `POST` | `/:id/close` | `close_report` | `{ reason }` | → closed |
| `POST` | `/:id/action-taken` | `mark_report_action_taken` | `{ reason }` | → action_taken |
| `POST` | `/:id/associate` | close_report roles | `{ reason, linkedReportIds? }` | event + meta only |

Support: note / escalate / assign only. T&S + Super: dismiss / close / action-taken / associate. Finance: no route. `aiUnavailable: true`. Evidence stubbed restricted. Idempotent status → `409 ALREADY_APPLIED`.

Live capture: `POST /live/sessions/:id/report` requires `targetUsername` when `kind=user`.

---

## Live (`/admin/live`)

Session safety monitor over `live_sessions` + `live_events`. Host approval stays on Users; report casework on Reports.

### Status mapping

| Condition | UI |
|-----------|-----|
| DB `live` + (`escalated_at` or open reports ≥ 1) | Incident |
| DB `live` else | Live |
| DB `upcoming` | Upcoming |
| DB `ended` + incident signal | Incident |
| DB `ended` else | Ended |

Open report = `live_reports.status` in (`open`, `under_review`, `escalated`).

### Queues

| Queue | Rule |
|-------|------|
| `live` | DB status = live |
| `upcoming` | DB status = upcoming |
| `ended` | DB status = ended |
| `incidents` | `escalated_at` or open reports ≥ 1 |

### Endpoints

| Method | Path | RBAC | Body | Effect |
|--------|------|------|------|--------|
| `GET` | `/` | live roles (super, T&S) | `queue`, `q` | `{ sessions, counts }` |
| `GET` | `/:id` | same | — | `{ session }` + timeline |
| `POST` | `/:id/note` | route | `{ reason }` | event + audit `live.note` |
| `POST` | `/:id/escalate` | route | `{ reason }` | set `escalated_at`; event + audit High |
| `POST` | `/:id/end` | `end_live` | `{ reason }` | → ended, `ended_reason=staff`; claim notifies; audit High |

Support/Finance: no route access. Flagged comments derived from `live_reports` kind=user (no message text). `aiUnavailable: true`. Host end persists `ended_reason` (`host` \| `connection`). Idempotent escalate/end → `409 ALREADY_APPLIED`.

---

## Reviews (`/admin/reviews`)

Seller-rating moderation over `reviews` + `review_events`. Hide comment only — star rating retained in public averages.

### Status mapping

| Condition | UI |
|-----------|-----|
| `comment_hidden` | Hidden |
| Order not completed / buyer mismatch | Eligibility anomaly |
| ≥2 reviews for same `order_id` | Duplicate anomaly |
| `escalated_at` set | Under review |
| else | Valid |

### Queues

`flagged` · `all` · `reported` (escalated) · `eligibility` · `with_comment`

### Endpoints

| Method | Path | RBAC | Body | Effect |
|--------|------|------|------|--------|
| `GET` | `/` | reviews roles | `queue`, `q` | `{ reviews, counts }` |
| `GET` | `/:id` | same | — | `{ review }` + history |
| `POST` | `/:id/note` | route | `{ reason }` | event + audit |
| `POST` | `/:id/escalate` | route | `{ reason }` | set `escalated_at` |
| `POST` | `/:id/hide` | `hide_review` | `{ reason }` | hide comment text; rating kept |

Public `GET /checkout/reviews/:username` returns empty `comment` when hidden. Support/Finance: no route. `aiUnavailable: true`.

---

## Domain roadmap (per-page plans)

Implement domains in this order (dependency / risk):

1. ~~Listings completion (hide/restore/notes)~~ **done**
2. ~~Disputes~~ **done**
3. ~~Refunds~~ **done**
4. ~~Payouts~~ **done**
5. ~~Payments~~ **done**
6. ~~Orders~~ **done**
7. ~~Users~~ **done**
8. ~~Reports~~ **done**
9. ~~Live~~ **done**
10. ~~Reviews~~ **done**
11. ~~Audit (`GET /admin/audit`)~~ **done**
12. ~~Operations (badges + dashboards)~~ **done**

Each page plan: endpoints, Zod, RBAC actions, migrations, DTO mapping, UI wire-up, test checklist.

**Do not** add new `/admin/{domain}` routers until that domain’s page plan is approved — this foundation only established conventions, RBAC, and audit.
