import { Router } from 'express';
import { z } from 'zod';
import { writeAdminAudit } from '../lib/admin-audit.js';
import {
  ensurePayoutForOrder,
  mirrorOrderPayoutStatus,
  type PayoutLedgerStatus,
} from '../lib/admin-payouts.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { getSellerMap } from '../lib/mappers.js';
import { getPaymentsProvider, type ProviderOpResult } from '../lib/payments/provider.js';
import { applyPayoutOutcome, failedResult, providerForRef } from '../lib/payments/settle.js';
import { ROUTE_ROLES } from '../lib/staff-rbac.js';
import { createServiceClient } from '../lib/supabase.js';
import {
  requireStaffAction,
  requireStaffAuth,
  requireStaffRole,
  type StaffRequest,
} from '../middleware/staff.js';

const router = Router();
const routeRoles = ROUTE_ROLES.payouts;

type PayoutEventAction =
  | 'created'
  | 'note'
  | 'hold'
  | 'release'
  | 'execute'
  | 'retry'
  | 'paid_out'
  | 'failed'
  | 'cancelled'
  | 'verify';

const reasonBody = z.object({ reason: z.string().trim().min(3) });

function formatAt(iso: string) {
  return iso.slice(0, 16).replace('T', ' ');
}

function openLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function uiStatus(status: PayoutLedgerStatus): string {
  const map: Record<PayoutLedgerStatus, string> = {
    not_yet_eligible: 'Not yet eligible',
    eligible: 'Eligible',
    verification_required: 'Verification required',
    on_hold: 'On Hold',
    processing: 'Processing',
    failed: 'Failed',
    paid_out: 'Paid out',
    cancelled: 'Cancelled',
  };
  return map[status] ?? status;
}

function queueToStatuses(queue: string): PayoutLedgerStatus[] | null {
  if (queue === 'eligible') return ['eligible'];
  if (queue === 'on_hold') return ['on_hold'];
  if (queue === 'verification') return ['verification_required'];
  if (queue === 'processing') return ['processing'];
  if (queue === 'failed') return ['failed'];
  if (queue === 'paid') return ['paid_out'];
  if (queue === 'not_eligible') return ['not_yet_eligible', 'cancelled'];
  if (queue === 'all') return null;
  return ['eligible'];
}

async function recordPayoutEvent(
  payoutId: string,
  actorId: string | null,
  action: PayoutEventAction,
  reason?: string | null,
) {
  const service = createServiceClient();
  const { error } = await service.from('payout_events').insert({
    payout_id: payoutId,
    actor_id: actorId,
    action,
    reason: reason ?? null,
  });
  if (error) console.warn('[admin/payouts] event write failed', error.message);
}

async function loadPayoutHistory(payoutId: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from('payout_events')
    .select('id, action, reason, created_at, actor_id')
    .eq('payout_id', payoutId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  const names = await getSellerMap(
    service,
    [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[],
  );
  const titles: Record<string, string> = {
    created: 'Payout queued',
    note: 'Internal note added',
    hold: 'Hold placed',
    release: 'Hold released',
    execute: 'Submitted to provider',
    retry: 'Retry submitted',
    paid_out: 'Paid out',
    failed: 'Payout failed',
    cancelled: 'Payout cancelled',
    verify: 'Provider status checked',
  };

  return rows.map((row) => {
    const by = row.actor_id ? names.get(String(row.actor_id)) : null;
    const detailParts = [by ? `@${by}` : 'System'];
    if (row.reason) detailParts.push(String(row.reason));
    return {
      id: String(row.id),
      at: formatAt(String(row.created_at)),
      title: titles[String(row.action)] ?? String(row.action),
      detail: detailParts.join(' · '),
    };
  });
}

function buildEligibility(row: Record<string, unknown>, payoutVerified: boolean, openDispute: boolean) {
  const status = String(row.status);
  return [
    { label: 'Order completed / eligible window', ok: status !== 'not_yet_eligible' },
    { label: 'No open dispute', ok: !openDispute && status !== 'on_hold' },
    { label: 'Seller payout verified', ok: payoutVerified },
    { label: 'Not cancelled after buyer refund', ok: status !== 'cancelled' },
  ];
}

function mapAdminPayout(
  row: Record<string, unknown>,
  extras: {
    sellerUsername: string;
    payoutVerified: boolean;
    openDispute: boolean;
    processingByName?: string | null;
    paidByName?: string | null;
    destinationMasked?: string | null;
    history?: { id: string; at: string; title: string; detail?: string }[];
  },
) {
  const status = String(row.status) as PayoutLedgerStatus;
  const verification: 'Approved' | 'Pending' | 'Not required' = extras.payoutVerified
    ? 'Approved'
    : status === 'verification_required'
      ? 'Pending'
      : 'Not required';

  return {
    id: String(row.id),
    seller: extras.sellerUsername,
    orderId: String(row.order_id),
    createdAt: openLabel(String(row.created_at)),
    status: uiStatus(status),
    dbStatus: status,
    headerStatus: uiStatus(status),
    verification,
    saleTotal: Number(row.sale_total ?? 0),
    commission: Number(row.commission ?? 0),
    fees: Number(row.fees ?? 0),
    net: Number(row.net ?? 0),
    commissionRate: Number(row.commission_rate ?? 0.075),
    feeRate: 0.02,
    holdReason: row.hold_reason ? String(row.hold_reason) : undefined,
    holdSellerFacing: row.hold_seller_facing ? String(row.hold_seller_facing) : undefined,
    disputeId: row.dispute_id ? String(row.dispute_id) : undefined,
    eligibility: buildEligibility(row, extras.payoutVerified, extras.openDispute),
    notYetEligibleNote:
      status === 'not_yet_eligible' ? 'Order has not reached payout eligibility yet.' : undefined,
    verificationBlocked: status === 'verification_required',
    processingAt: row.processing_at ? openLabel(String(row.processing_at)) : undefined,
    processingBy: extras.processingByName ?? undefined,
    paidAt: row.paid_at ? openLabel(String(row.paid_at)) : undefined,
    paidBy: extras.paidByName ?? undefined,
    destinationMasked: extras.destinationMasked ?? 'Not on file',
    provider: row.provider ? String(row.provider) : undefined,
    providerRef: row.provider_ref ? String(row.provider_ref) : undefined,
    history: extras.history ?? [],
    failedRetryAvailable: status === 'failed',
  };
}

async function loadPayoutDetailPayload(payoutId: string) {
  const service = createServiceClient();
  const { data: row, error } = await service.from('payouts').select('*').eq('id', payoutId).maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const { data: seller } = await service
    .from('profiles')
    .select('id, username, payout_verified')
    .eq('id', row.seller_id)
    .maybeSingle();

  let openDispute = false;
  if (row.dispute_id) {
    const { data: dispute } = await service
      .from('order_disputes')
      .select('status')
      .eq('id', row.dispute_id)
      .maybeSingle();
    openDispute = Boolean(dispute && ['open', 'under_review'].includes(String(dispute.status)));
  } else {
    const { data: dispute } = await service
      .from('order_disputes')
      .select('id, status')
      .eq('order_id', row.order_id)
      .maybeSingle();
    openDispute = Boolean(dispute && ['open', 'under_review'].includes(String(dispute.status)));
  }

  const profileIds = [row.seller_id, row.processing_by, row.paid_by].filter(Boolean).map(String);
  const names = await getSellerMap(service, profileIds);
  const history = await loadPayoutHistory(String(row.id)).catch(() => []);
  const { data: account } = await service
    .from('seller_payout_accounts')
    .select('bank_name, account_number_last4, status')
    .eq('seller_id', row.seller_id)
    .maybeSingle();
  const destinationMasked =
    account?.status === 'verified' ? `${account.bank_name} ····${account.account_number_last4}` : null;

  return {
    payout: mapAdminPayout(row as Record<string, unknown>, {
      sellerUsername: seller?.username ?? names.get(String(row.seller_id)) ?? 'unknown',
      payoutVerified: Boolean(seller?.payout_verified),
      openDispute,
      processingByName: row.processing_by ? `@${names.get(String(row.processing_by)) ?? 'staff'}` : null,
      paidByName: row.paid_by ? `@${names.get(String(row.paid_by)) ?? 'staff'}` : null,
      destinationMasked,
      history,
    }),
  };
}

async function backfillPayouts(service: ReturnType<typeof createServiceClient>) {
  const { data: orders } = await service
    .from('orders')
    .select('id, payout_status')
    .in('payout_status', ['eligible', 'on_hold', 'processing', 'paid_out', 'failed'])
    .order('created_at', { ascending: false })
    .limit(200);

  for (const order of orders ?? []) {
    const { data: existing } = await service.from('payouts').select('id').eq('order_id', order.id).maybeSingle();
    if (existing) continue;
    const intent =
      String(order.payout_status) === 'on_hold'
        ? 'on_hold'
        : String(order.payout_status) === 'eligible'
          ? 'eligible'
          : 'sync';
    await ensurePayoutForOrder(service, { orderId: String(order.id), intent });
  }
}

async function runExecute(
  payoutId: string,
  userId: string,
  adminRole: StaffRequest['adminRole'],
  reason: string,
  isRetry: boolean,
) {
  const service = createServiceClient();
  const { data: existing, error } = await service.from('payouts').select('*').eq('id', payoutId).maybeSingle();
  if (error) throw error;
  if (!existing) return { kind: 'not_found' as const };

  const status = String(existing.status) as PayoutLedgerStatus;
  if (status === 'processing' || status === 'paid_out') return { kind: 'already' as const };
  if (isRetry && status !== 'failed') {
    return { kind: 'conflict' as const, message: 'Only failed payouts can be retried' };
  }
  if (!isRetry && status !== 'eligible') {
    if (status === 'verification_required') {
      return { kind: 'conflict' as const, message: 'Seller payout verification required' };
    }
    return { kind: 'conflict' as const, message: 'Payout is not eligible to execute' };
  }

  const provider = getPaymentsProvider();
  const { data: account, error: accountError } = await service
    .from('seller_payout_accounts')
    .select('bank_code, account_number, status, provider, provider_recipient_id')
    .eq('seller_id', existing.seller_id)
    .maybeSingle();
  if (accountError) throw accountError;
  const accountUsable = account?.status === 'verified' && account.provider === provider.name;
  if (provider.name === 'flutterwave' && !accountUsable) {
    return { kind: 'conflict' as const, message: 'Seller has no verified live payout account' };
  }

  const now = new Date().toISOString();
  const { error: procError } = await service
    .from('payouts')
    .update({
      status: 'processing',
      processing_at: now,
      processing_by: userId,
      failed_at: null,
      provider: provider.name,
    })
    .eq('id', payoutId);
  if (procError) throw procError;

  await mirrorOrderPayoutStatus(service, String(existing.order_id), 'processing');
  await recordPayoutEvent(payoutId, userId, isRetry ? 'retry' : 'execute', reason);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: isRetry ? 'payout.retry' : 'payout.execute',
    resourceType: 'payout',
    resourceId: payoutId,
    reason,
    sensitivity: 'High',
    meta: { orderId: existing.order_id, net: existing.net, provider: provider.name },
  });

  let result: ProviderOpResult;
  try {
    result = await provider.transfer({
      payoutId,
      amount: Number(existing.net ?? 0),
      recipientId: accountUsable ? String(account?.provider_recipient_id ?? '') : '',
      bankCode: accountUsable ? String(account?.bank_code ?? '') : '',
      accountNumber: accountUsable ? String(account?.account_number ?? '') : '',
      narration: `Throve payout ${existing.order_id}`,
    });
  } catch (err) {
    result = failedResult(err);
  }
  await applyPayoutOutcome(
    service,
    { id: payoutId, orderId: String(existing.order_id) },
    result,
    userId,
    provider.name,
  );

  return { kind: 'ok' as const };
}

router.get('/', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const service = createServiceClient();
  try {
    await backfillPayouts(service);
  } catch (err) {
    console.warn('[admin/payouts] backfill failed', err instanceof Error ? err.message : err);
  }

  const queue = String(req.query.queue ?? 'eligible');
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const statuses = queueToStatuses(queue);

  let query = service.from('payouts').select('*').order('created_at', { ascending: false }).limit(200);
  if (statuses) query = query.in('status', statuses);

  const { data, error } = await query;
  if (error) return handleSupabaseError(res, error);

  const rows = data ?? [];
  const sellerIds = [...new Set(rows.map((r) => String(r.seller_id)))];
  const { data: sellers } = await service
    .from('profiles')
    .select('id, username, payout_verified')
    .in('id', sellerIds);
  const sellerMap = new Map(
    (sellers ?? []).map((s) => [String(s.id), { username: String(s.username), verified: Boolean(s.payout_verified) }]),
  );

  let payouts = rows.map((row) => {
    const seller = sellerMap.get(String(row.seller_id));
    return mapAdminPayout(row as Record<string, unknown>, {
      sellerUsername: seller?.username ?? 'unknown',
      payoutVerified: seller?.verified ?? false,
      openDispute: Boolean(row.dispute_id) && String(row.status) === 'on_hold',
    });
  });

  if (q) {
    payouts = payouts.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.orderId.toLowerCase().includes(q) ||
        p.seller.toLowerCase().includes(q),
    );
  }

  const { data: allRows } = await service.from('payouts').select('status');
  const counts = {
    eligible: 0,
    on_hold: 0,
    verification: 0,
    processing: 0,
    failed: 0,
    paid: 0,
    not_eligible: 0,
  };
  for (const row of allRows ?? []) {
    const s = String(row.status);
    if (s === 'eligible') counts.eligible += 1;
    else if (s === 'on_hold') counts.on_hold += 1;
    else if (s === 'verification_required') counts.verification += 1;
    else if (s === 'processing') counts.processing += 1;
    else if (s === 'failed') counts.failed += 1;
    else if (s === 'paid_out') counts.paid += 1;
    else if (s === 'not_yet_eligible' || s === 'cancelled') counts.not_eligible += 1;
  }

  return res.json({ payouts, counts });
});

router.get('/:id', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  try {
    const payload = await loadPayoutDetailPayload(String(req.params.id));
    if (!payload) return sendError(res, 404, 'Payout not found', 'NOT_FOUND');
    return res.json(payload);
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      return handleSupabaseError(res, err as { message: string; code?: string });
    }
    return sendError(res, 500, 'Failed to load payout', 'ERROR');
  }
});

router.post('/:id/execute', requireStaffAuth, requireStaffAction('execute_payout'), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const parsed = reasonBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

  try {
    const result = await runExecute(String(req.params.id), userId, adminRole, parsed.data.reason, false);
    if (result.kind === 'not_found') return sendError(res, 404, 'Payout not found', 'NOT_FOUND');
    if (result.kind === 'already') return sendError(res, 409, 'Payout already executed', 'ALREADY_APPLIED');
    if (result.kind === 'conflict') return sendError(res, 409, result.message, 'CONFLICT');
    const payload = await loadPayoutDetailPayload(String(req.params.id));
    return res.json(payload);
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      return handleSupabaseError(res, err as { message: string; code?: string });
    }
    return sendError(res, 500, 'Execute failed', 'ERROR');
  }
});

router.post('/:id/retry', requireStaffAuth, requireStaffAction('execute_payout'), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const parsed = reasonBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

  try {
    const result = await runExecute(String(req.params.id), userId, adminRole, parsed.data.reason, true);
    if (result.kind === 'not_found') return sendError(res, 404, 'Payout not found', 'NOT_FOUND');
    if (result.kind === 'already') return sendError(res, 409, 'Payout already executed', 'ALREADY_APPLIED');
    if (result.kind === 'conflict') return sendError(res, 409, result.message, 'CONFLICT');
    const payload = await loadPayoutDetailPayload(String(req.params.id));
    return res.json(payload);
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      return handleSupabaseError(res, err as { message: string; code?: string });
    }
    return sendError(res, 500, 'Retry failed', 'ERROR');
  }
});

router.post('/:id/hold', requireStaffAuth, requireStaffAction('hold_payout'), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const parsed = reasonBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

  const payoutId = String(req.params.id);
  const service = createServiceClient();
  const { data: existing, error } = await service.from('payouts').select('*').eq('id', payoutId).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!existing) return sendError(res, 404, 'Payout not found', 'NOT_FOUND');

  const status = String(existing.status);
  if (status !== 'eligible' && status !== 'verification_required') {
    return sendError(res, 409, 'Only eligible payouts can be held', 'CONFLICT');
  }

  const { error: updError } = await service
    .from('payouts')
    .update({
      status: 'on_hold',
      hold_reason: parsed.data.reason,
      hold_seller_facing: parsed.data.reason,
      dispute_id: null,
    })
    .eq('id', payoutId);
  if (updError) return handleSupabaseError(res, updError);

  await mirrorOrderPayoutStatus(service, String(existing.order_id), 'on_hold');
  await recordPayoutEvent(payoutId, userId, 'hold', parsed.data.reason);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: 'payout.hold',
    resourceType: 'payout',
    resourceId: payoutId,
    reason: parsed.data.reason,
    sensitivity: 'High',
    meta: { orderId: existing.order_id },
  });

  const payload = await loadPayoutDetailPayload(payoutId);
  return res.json(payload);
});

router.post('/:id/release', requireStaffAuth, requireStaffAction('hold_payout'), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const parsed = reasonBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

  const payoutId = String(req.params.id);
  const service = createServiceClient();
  const { data: existing, error } = await service.from('payouts').select('*').eq('id', payoutId).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!existing) return sendError(res, 404, 'Payout not found', 'NOT_FOUND');
  if (String(existing.status) !== 'on_hold') {
    return sendError(res, 409, 'Only held payouts can be released', 'CONFLICT');
  }

  if (existing.dispute_id) {
    const { data: dispute } = await service
      .from('order_disputes')
      .select('status')
      .eq('id', existing.dispute_id)
      .maybeSingle();
    if (dispute && ['open', 'under_review'].includes(String(dispute.status))) {
      return sendError(res, 409, 'Cannot release while dispute is open', 'CONFLICT');
    }
  } else {
    const { data: dispute } = await service
      .from('order_disputes')
      .select('status')
      .eq('order_id', existing.order_id)
      .maybeSingle();
    if (dispute && ['open', 'under_review'].includes(String(dispute.status))) {
      return sendError(res, 409, 'Cannot release while dispute is open', 'CONFLICT');
    }
  }

  const { data: seller } = await service
    .from('profiles')
    .select('payout_verified')
    .eq('id', existing.seller_id)
    .maybeSingle();
  const next: PayoutLedgerStatus = seller?.payout_verified ? 'eligible' : 'verification_required';

  const { error: updError } = await service
    .from('payouts')
    .update({
      status: next,
      hold_reason: null,
      hold_seller_facing: null,
      dispute_id: null,
    })
    .eq('id', payoutId);
  if (updError) return handleSupabaseError(res, updError);

  await mirrorOrderPayoutStatus(service, String(existing.order_id), next);
  await recordPayoutEvent(payoutId, userId, 'release', parsed.data.reason);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: 'payout.release',
    resourceType: 'payout',
    resourceId: payoutId,
    reason: parsed.data.reason,
    sensitivity: 'Standard',
    meta: { orderId: existing.order_id, status: next },
  });

  const payload = await loadPayoutDetailPayload(payoutId);
  return res.json(payload);
});

router.post('/:id/verify', requireStaffAuth, requireStaffAction('execute_payout'), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const payoutId = String(req.params.id);
  const service = createServiceClient();
  const { data: existing, error } = await service.from('payouts').select('*').eq('id', payoutId).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!existing) return sendError(res, 404, 'Payout not found', 'NOT_FOUND');

  const status = String(existing.status);
  if (status === 'paid_out') return sendError(res, 409, 'Payout already paid out', 'ALREADY_APPLIED');
  if (status !== 'processing' && status !== 'failed') {
    return sendError(res, 409, 'Only processing or failed payouts can be verified', 'CONFLICT');
  }

  let note = 'No provider reference on file';
  if (existing.provider_ref) {
    const provider = providerForRef(String(existing.provider_ref));
    try {
      const result = await provider.transferStatus(String(existing.provider_ref));
      if (result.status !== 'pending') {
        await applyPayoutOutcome(
          service,
          { id: payoutId, orderId: String(existing.order_id) },
          result,
          userId,
          provider.name,
        );
      }
      note = `${provider.name} status: ${result.status}`;
    } catch (err) {
      note = err instanceof Error ? err.message : 'Provider status check failed';
    }
  }

  await recordPayoutEvent(payoutId, userId, 'verify', note);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: 'payout.verify',
    resourceType: 'payout',
    resourceId: payoutId,
    reason: note,
    sensitivity: 'Standard',
    meta: { orderId: existing.order_id, providerRef: existing.provider_ref ?? null },
  });

  const payload = await loadPayoutDetailPayload(payoutId);
  return res.json(payload);
});

router.post('/:id/note', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const { userId, adminRole } = req as StaffRequest;
  const parsed = reasonBody.safeParse(req.body);
  if (!parsed.success) return sendError(res, 400, 'Reason is required', 'VALIDATION');

  const payoutId = String(req.params.id);
  const service = createServiceClient();
  const { data: existing, error } = await service.from('payouts').select('id, order_id').eq('id', payoutId).maybeSingle();
  if (error) return handleSupabaseError(res, error);
  if (!existing) return sendError(res, 404, 'Payout not found', 'NOT_FOUND');

  await recordPayoutEvent(payoutId, userId, 'note', parsed.data.reason);
  void writeAdminAudit(service, {
    actorId: userId,
    actorRole: adminRole,
    action: 'payout.note',
    resourceType: 'payout',
    resourceId: payoutId,
    reason: parsed.data.reason,
    sensitivity: 'Standard',
    meta: { orderId: existing.order_id },
  });

  const payload = await loadPayoutDetailPayload(payoutId);
  return res.json(payload);
});

export default router;
