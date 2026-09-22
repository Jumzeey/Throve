import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, roleLabel } from '@/auth/AuthContext';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState, ErrorState, LoadingState, OfflineBanner } from '@/components/admin/empty-state';
import { FilterChips } from '@/components/admin/filter-chips';
import { StatusBadge, type StatusTone } from '@/components/admin/status-badge';
import { usePageChrome } from '@/components/layout/shell-chrome';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatNaira, mockPayouts, type MockPayout } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { canAct, ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { Check, Lock, X } from 'lucide-react';

type DemoState = 'ready' | 'loading' | 'empty' | 'error' | 'offline';
type QueueFilter =
  | 'eligible'
  | 'on_hold'
  | 'verification'
  | 'processing'
  | 'failed'
  | 'paid'
  | 'not_eligible';
type ConfirmKind = 'process' | 'hold' | 'release' | 'note' | 'maintain' | null;

type PayoutOverride = {
  status?: MockPayout['status'];
  headerStatus?: string;
  history?: MockPayout['history'];
  flash?: string | null;
  holdReason?: string;
  processingAt?: string;
  processingBy?: string;
  paidAt?: string;
  paidBy?: string;
};

function statusTone(s: MockPayout['status']): StatusTone {
  if (s === 'Eligible') return 'plum';
  if (s === 'On Hold' || s === 'Verification required') return 'hold';
  if (s === 'Processing') return 'neutral';
  if (s === 'Paid out') return 'clear';
  if (s === 'Failed') return 'risk';
  return 'neutral';
}

function verificationTone(v: MockPayout['verification']): StatusTone {
  if (v === 'Approved') return 'clear';
  if (v === 'Pending') return 'hold';
  return 'neutral';
}

export function PayoutsPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [queue, setQueue] = useState<QueueFilter>('eligible');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(mockPayouts[0]?.id ?? null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [demoState, setDemoState] = useState<DemoState>('ready');
  const [overrides, setOverrides] = useState<Record<string, PayoutOverride>>({});
  const [noteDraft, setNoteDraft] = useState('');
  const [actionInvalid, setActionInvalid] = useState<string | null>(null);

  const canExecute = session ? canAct(session.role, 'execute_payout') : false;
  const canHold = session ? canAct(session.role, 'hold_payout') : false;
  const isTs = session?.role === 'trust_safety';
  const isSupport = session?.role === 'support';
  const showAmounts = !isTs && !isSupport;

  const payouts = useMemo(
    () =>
      mockPayouts.map((p) => {
        const o = overrides[p.id];
        if (!o) return p;
        return {
          ...p,
          status: o.status ?? p.status,
          headerStatus: o.headerStatus ?? p.headerStatus,
          history: o.history ?? p.history,
          holdReason: o.holdReason ?? p.holdReason,
          processingAt: o.processingAt ?? p.processingAt,
          processingBy: o.processingBy ?? p.processingBy,
          paidAt: o.paidAt ?? p.paidAt,
          paidBy: o.paidBy ?? p.paidBy,
        };
      }),
    [overrides],
  );

  const eligibleCount = payouts.filter((p) => p.status === 'Eligible').length;
  const holdCount = payouts.filter((p) => p.status === 'On Hold').length;
  const verifyCount = payouts.filter((p) => p.status === 'Verification required').length;
  const processingCount = payouts.filter((p) => p.status === 'Processing').length;
  const failedCount = payouts.filter((p) => p.status === 'Failed').length;
  const eligibleTotal = payouts
    .filter((p) => p.status === 'Eligible')
    .reduce((sum, p) => sum + p.net, 0);

  usePageChrome({
    title: 'Payouts',
    subtitle: `${eligibleCount} eligible · ${holdCount} On Hold · ${failedCount} failed · execution authority: Finance`,
    search,
    onSearchChange: setSearch,
    searchPlaceholder: 'Payout, order or seller',
    bleed: true,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payouts.filter((p) => {
      if (queue === 'eligible' && p.status !== 'Eligible') return false;
      if (queue === 'on_hold' && p.status !== 'On Hold') return false;
      if (queue === 'verification' && p.status !== 'Verification required') return false;
      if (queue === 'processing' && p.status !== 'Processing') return false;
      if (queue === 'failed' && p.status !== 'Failed') return false;
      if (queue === 'paid' && p.status !== 'Paid out') return false;
      if (queue === 'not_eligible' && p.status !== 'Not yet eligible') return false;
      if (!q) return true;
      return (
        p.id.toLowerCase().includes(q) ||
        p.seller.toLowerCase().includes(q) ||
        p.orderId.toLowerCase().includes(q)
      );
    });
  }, [payouts, queue, search]);

  const selected = payouts.find((p) => p.id === selectedId) ?? null;
  const selectedFlash = selected ? overrides[selected.id]?.flash : null;

  function patchPayout(id: string, next: PayoutOverride) {
    setOverrides((current) => ({
      ...current,
      [id]: { ...current[id], ...next },
    }));
  }

  function appendHistory(payout: MockPayout, entry: MockPayout['history'][number]) {
    return [...(overrides[payout.id]?.history ?? payout.history), entry];
  }

  function stampNow() {
    return new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function actorLabel() {
    return session ? `${session.name} (${roleLabel(session.role)})` : 'Staff';
  }

  function tryProcess(payout: MockPayout) {
    if (payout.status === 'On Hold' || payout.disputeId) {
      setActionInvalid(
        'A dispute was opened on this order. The payout returned to On Hold. Your process request was not executed.',
      );
      show('Action no longer valid');
      return;
    }
    setConfirm('process');
  }

  return (
    <>
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1.4fr)_minmax(360px,0.95fr)]">
        <div className="flex min-h-0 min-w-0 flex-col border-r border-[#dccfc4] bg-panel">
          <div className="space-y-3 border-b border-[#e7dcd2] px-4 py-4">
            <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
              Screen 11 preview states
            </div>
            <FilterChips
              tone="soft"
              value={demoState}
              onChange={(id) => setDemoState(id as DemoState)}
              options={[
                { id: 'ready', label: 'Ready' },
                { id: 'loading', label: 'Loading' },
                { id: 'empty', label: 'Empty' },
                { id: 'error', label: 'Error' },
                { id: 'offline', label: 'Offline' },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <FilterChips
                value={queue}
                onChange={(id) => setQueue(id as QueueFilter)}
                options={[
                  { id: 'eligible', label: 'Eligible', count: eligibleCount },
                  { id: 'on_hold', label: 'On Hold', count: holdCount },
                  { id: 'verification', label: 'Verification required', count: verifyCount },
                  { id: 'processing', label: 'Processing', count: processingCount },
                  { id: 'failed', label: 'Failed', count: failedCount },
                  { id: 'not_eligible', label: 'Not yet eligible' },
                  { id: 'paid', label: 'Paid out' },
                ]}
              />
              {showAmounts ? (
                <div className="ml-auto text-[11.5px] font-semibold tabular-nums text-espresso">
                  Eligible total {formatNaira(eligibleTotal)}
                </div>
              ) : null}
            </div>
            {banner}
            {demoState === 'offline' ? <OfflineBanner onRetry={() => setDemoState('ready')} /> : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {demoState === 'loading' ? <LoadingState label="Loading payouts…" /> : null}

            {demoState === 'error' ? (
              <ErrorState
                title="Payouts could not load"
                description="Nothing was changed. Retry when the connection is stable."
                onRetry={() => setDemoState('ready')}
              />
            ) : null}

            {demoState === 'empty' || (demoState === 'ready' && rows.length === 0) ? (
              <EmptyState
                title="Nothing in this filter"
                description={
                  queue === 'failed'
                    ? 'No failed payouts today. Clear the filter to see the full queue.'
                    : 'No payouts match this filter.'
                }
                actionLabel="Clear filter"
                onAction={() => {
                  setQueue('eligible');
                  setSearch('');
                  setDemoState('ready');
                }}
              />
            ) : null}

            {(demoState === 'ready' || demoState === 'offline') && rows.length > 0 ? (
              <>
                <div className="sticky top-0 z-[1] grid grid-cols-[88px_minmax(0,1.2fr)_72px_72px_64px_72px_88px_120px] gap-x-2 border-b border-[#e7dcd2] bg-[#fbf5ef] px-4 py-3 text-[9.5px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                  <span>Payout</span>
                  <span>Seller & order</span>
                  <span>Sale</span>
                  <span>Commission</span>
                  <span>Fee</span>
                  <span>Net</span>
                  <span>Verification</span>
                  <span>Status</span>
                </div>
                {rows.map((p) => {
                  const active = p.id === selectedId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={demoState === 'offline'}
                      onClick={() => {
                        setSelectedId(p.id);
                        setActionInvalid(null);
                      }}
                      className={cn(
                        'grid w-full grid-cols-[88px_minmax(0,1.2fr)_72px_72px_64px_72px_88px_120px] items-center gap-x-2 border-b border-[#f0e7de] px-4 py-3.5 text-left last:border-0',
                        active ? 'bg-[#f9f1ea]' : 'bg-panel hover:bg-[#fbf5ef]',
                        demoState === 'offline' && 'opacity-60',
                      )}
                    >
                      <span className="font-mono text-[11px] font-semibold text-plum">{p.id}</span>
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] font-semibold text-espresso">@{p.seller}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-body">{p.orderId}</div>
                      </div>
                      <span className="text-[12px] tabular-nums text-espresso">
                        {showAmounts ? formatNaira(p.saleTotal) : '—'}
                      </span>
                      <span className="text-[12px] tabular-nums text-espresso">
                        {showAmounts ? formatNaira(p.commission) : '—'}
                      </span>
                      <span className="text-[12px] tabular-nums text-espresso">
                        {showAmounts ? formatNaira(p.fees) : '—'}
                      </span>
                      <span className="text-[12px] font-semibold tabular-nums text-espresso">
                        {showAmounts ? formatNaira(p.net) : '—'}
                      </span>
                      <StatusBadge tone={verificationTone(p.verification)}>{p.verification}</StatusBadge>
                      <StatusBadge tone={statusTone(p.status)}>{p.status}</StatusBadge>
                    </button>
                  );
                })}
              </>
            ) : null}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col bg-panel">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center px-6 text-[12.5px] text-body">
              Select a payout to inspect.
            </div>
          ) : demoState === 'error' ? (
            <div className="flex flex-1 flex-col justify-center gap-3 px-5">
              <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                <AlertTitle className="text-[12px] text-risk">Payout could not load</AlertTitle>
                <AlertDescription className="text-[11.5px] text-risk">
                  Nothing was changed.{' '}
                  <button type="button" className="font-semibold underline" onClick={() => setDemoState('ready')}>
                    Retry
                  </button>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <>
              <div className="border-b border-[#e7dcd2] px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-[26px] leading-none text-espresso">{selected.id}</div>
                    <div className="mt-2 text-[12.5px] text-body">
                      @{selected.seller} · {selected.orderId} · {selected.createdAt}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge tone={statusTone(selected.status)}>{selected.headerStatus}</StatusBadge>
                    {isTs ? <StatusBadge tone="plum">Trust & Safety</StatusBadge> : null}
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-4">
                {selectedFlash ? (
                  <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                    <AlertTitle className="text-[12px] text-clear">Recorded</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-clear">{selectedFlash}</AlertDescription>
                  </Alert>
                ) : null}

                {actionInvalid ? (
                  <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                    <AlertTitle className="text-[12px] text-[#8a5a15]">A dispute was opened on this order</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-[#8a5a15]">{actionInvalid}</AlertDescription>
                  </Alert>
                ) : null}

                {selected.recordStale ? (
                  <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                    <AlertTitle className="text-[12px] text-[#8a5a15]">
                      Hold placed while you were reviewing
                    </AlertTitle>
                    <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                      {selected.recordStale.by} placed a hold at {selected.recordStale.at}. Reload before acting.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {demoState === 'offline' ? (
                  <Alert className="rounded-[5px] border-border-soft bg-[#f3ede6]">
                    <AlertTitle className="text-[12px] text-espresso">No connection</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-body">
                      Payout execution is disabled while offline to prevent duplicate submissions.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {isTs ? (
                  <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3 text-[12.5px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-body">Payout</span>
                      <span className="font-semibold text-espresso">
                        {selected.id} · {selected.status}
                      </span>
                    </div>
                    {selected.disputeId ? (
                      <div className="mt-2 flex justify-between gap-2">
                        <span className="text-body">Linked case</span>
                        <span className="font-semibold text-espresso">{selected.disputeId}</span>
                      </div>
                    ) : null}
                    <div className="mt-2 flex justify-between gap-2">
                      <span className="text-body">Amounts</span>
                      <span className="font-semibold text-body">Not required for this role</span>
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                      No execute payout control is rendered for Trust & Safety. Money movement belongs to Finance.
                    </p>
                  </div>
                ) : null}

                {showAmounts ? (
                  <div>
                    <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Payout calculation
                    </div>
                    <div className="overflow-hidden rounded-[8px] border border-[#ebe3da] text-[12.5px]">
                      <div className="flex justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5">
                        <span className="text-body">Item sale price</span>
                        <span className="font-semibold tabular-nums text-espresso">
                          {formatNaira(selected.saleTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5">
                        <span className="text-body">
                          Throve commission · {Math.round(selected.commissionRate * 1000) / 10}%
                        </span>
                        <span className="font-semibold tabular-nums text-espresso">
                          {selected.commission === 0 ? formatNaira(0) : `−${formatNaira(selected.commission)}`}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5">
                        <span className="text-body">
                          Payment processing fee · {Math.round(selected.feeRate * 100)}%
                        </span>
                        <span className="font-semibold tabular-nums text-espresso">
                          −{formatNaira(selected.fees)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 bg-[#fbf7f2] px-3 py-2.5">
                        <span className="font-semibold text-espresso">Net seller payout</span>
                        <span className="text-[16px] font-semibold tabular-nums text-espresso">
                          {formatNaira(selected.net)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {selected.promoZeroCommission ? (
                  <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                    <AlertTitle className="text-[12px] text-[#8a5a15]">0% Throve commission</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                      First 3 completed sales. Applies to {selected.promoSaleOf ?? 'this sale'} for this seller. No
                      time limit. The 2% payment processing fee still applies.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.status === 'On Hold' && selected.holdReason ? (
                  <div className="space-y-3">
                    <div className="rounded-[8px] border border-hold-border bg-hold-bg px-3 py-3">
                      <div className="text-[10px] font-semibold tracking-[0.12em] text-[#8a5a15] uppercase">
                        Internal hold reason
                      </div>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#8a5a15]">{selected.holdReason}</p>
                    </div>
                    {selected.holdSellerFacing ? (
                      <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3">
                        <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                          Seller-facing wording
                        </div>
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-espresso">
                          {selected.holdSellerFacing}
                        </p>
                        <p className="mt-2 text-[11px] text-body">
                          Internal risk categories are never shown on seller-facing surfaces.
                        </p>
                      </div>
                    ) : null}
                    <p className="text-[11.5px] leading-relaxed text-body">
                      Release is unavailable while the dispute is unresolved. Finance cannot decide the case; the
                      outcome must come from Trust & Safety.
                    </p>
                  </div>
                ) : null}

                {selected.status === 'Not yet eligible' && selected.notYetEligibleNote ? (
                  <Alert className="rounded-[5px] border-border-soft bg-[#f3ede6]">
                    <AlertTitle className="text-[12px] text-espresso">Order not Completed</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-body">
                      {selected.notYetEligibleNote}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.verificationBlocked ? (
                  <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                    <AlertTitle className="text-[12px] text-[#8a5a15]">
                      Payout blocked — verification pending
                    </AlertTitle>
                    <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                      Seller payout verification is outstanding. Verification documents are role-restricted and not
                      displayed in this console.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.status === 'Processing' ? (
                  <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3">
                    <div className="text-[12.5px] font-semibold text-espresso">Submitted to provider</div>
                    <p className="mt-1 text-[11.5px] text-body">
                      {showAmounts ? `${formatNaira(selected.net)} · ` : null}
                      submitted {selected.processingAt} by {selected.processingBy}. Awaiting provider confirmation.
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e7dcd2]">
                      <div className="h-full w-1/2 rounded-full bg-plum" />
                    </div>
                  </div>
                ) : null}

                {selected.status === 'Paid out' ? (
                  <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                    <AlertTitle className="text-[12px] text-clear">
                      {showAmounts ? `${formatNaira(selected.net)} paid out` : 'Paid out'}
                    </AlertTitle>
                    <AlertDescription className="text-[11.5px] text-clear">
                      {selected.paidAt} · by {selected.paidBy} · reference recorded · audit entry created
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.status === 'Failed' ? (
                  <div className="space-y-2">
                    <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                      <AlertTitle className="text-[12px] text-risk">Payout failed at provider</AlertTitle>
                      <AlertDescription className="text-[11.5px] text-risk">
                        Payout was not confirmed. Verify the provider status before retrying — retry becomes
                        available only once the provider confirms the payout failed.
                      </AlertDescription>
                    </Alert>
                    <div className="flex flex-col gap-2">
                      <Button type="button" variant="outline" size="sm" className="border-risk text-risk">
                        Investigate provider status
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled>
                        Retry — unavailable until status confirmed
                      </Button>
                    </div>
                  </div>
                ) : null}

                {!isTs ? (
                  <div>
                    <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Eligibility checks
                    </div>
                    <ul className="space-y-2 rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3">
                      {selected.eligibility.map((item) => (
                        <li key={item.label} className="flex items-start gap-2 text-[12.5px]">
                          <span
                            className={cn(
                              'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full',
                              item.ok ? 'bg-clear-bg text-clear' : 'bg-risk-bg text-risk',
                            )}
                          >
                            {item.ok ? <Check className="size-3" /> : <X className="size-3" />}
                          </span>
                          <span className={item.ok ? 'text-espresso' : 'font-semibold text-risk'}>
                            {item.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {showAmounts ? (
                  <div>
                    <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Payout destination
                    </div>
                    <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3 text-[12.5px]">
                      <div className="font-semibold text-espresso">{selected.destinationMasked}</div>
                      <div className="mt-1 text-[11.5px] text-body">{selected.testReference}</div>
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Action history
                  </div>
                  <ul className="divide-y divide-[#ebe3da] rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3">
                    {selected.history.map((event) => (
                      <li key={event.id} className="py-2.5 text-[12.5px] leading-snug text-espresso">
                        <span className="font-semibold">{event.title}</span>
                        <span className="text-body">
                          {' '}
                          · {event.at}
                          {event.detail ? ` · ${event.detail}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {selected.disputeId ? (
                  <Link to="/disputes" className="inline-block text-[11px] font-semibold text-plum hover:underline">
                    Open dispute {selected.disputeId}
                  </Link>
                ) : null}

                {isSupport ? (
                  <Alert className="rounded-[5px] border-dashed border-[#d4c8bc] bg-transparent">
                    <Lock className="size-3.5 text-body" />
                    <AlertTitle className="text-[11px] font-semibold text-espresso">Permission denied</AlertTitle>
                    <AlertDescription className="text-[11px] text-body">
                      You do not have permission to perform this action. Contact a Super Admin if you believe this
                      is wrong.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <div className="border-t border-[#e7dcd2] bg-[#fbf7f2] px-5 py-4">
                <div className="mb-2.5 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                  Payout actions · {session ? ROLE_LABELS[session.role] : 'Staff'}
                </div>

                {isTs ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-hold-border text-[#8a5a15]"
                      disabled={demoState === 'offline'}
                      onClick={() => setConfirm('maintain')}
                    >
                      Maintain hold
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={demoState === 'offline'}
                      onClick={() => {
                        setNoteDraft('');
                        setConfirm('note');
                      }}
                    >
                      Add case note
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {canExecute && selected.status === 'Eligible' ? (
                      <Button
                        type="button"
                        className="w-full bg-[#3e2b36] text-panel hover:bg-[#2f2029]"
                        disabled={demoState === 'offline'}
                        onClick={() => tryProcess(selected)}
                      >
                        Process payout — review & confirm
                      </Button>
                    ) : null}

                    {selected.status === 'On Hold' ? (
                      <Button type="button" variant="outline" size="sm" disabled>
                        Release hold — unavailable until case closes
                      </Button>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {canHold && selected.status === 'Eligible' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={demoState === 'offline'}
                          onClick={() => setConfirm('hold')}
                        >
                          Place hold
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={demoState === 'offline'}
                        onClick={() => {
                          setNoteDraft('');
                          setConfirm('note');
                        }}
                      >
                        Add internal note
                      </Button>
                    </div>
                  </div>
                )}

                <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                  Amounts are calculated by Throve and cannot be edited here. Simulated payouts do not move real
                  money.
                </p>
              </div>
            </>
          )}
        </aside>
      </div>

      {confirm === 'process' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={`Process payout ${selected.id}`}
          description="Confirm the seller net amount and the eligibility checks before executing. The amount is calculated by Throve and cannot be edited here."
          confirmLabel="Process payout"
          requireCheckbox
          checkboxLabel="I have reviewed the eligibility checks for this payout."
          reasonLabel="Context / reason recorded"
          reasonPlaceholder="Approved payout execution — all eligibility checks satisfied."
          defaultReason="Approved payout execution — all eligibility checks satisfied."
          metaRows={[
            { label: 'Seller', value: `@${selected.seller} · verification approved` },
            { label: 'Order', value: `${selected.orderId} · Completed` },
            { label: 'Net payout', value: formatNaira(selected.net) },
            { label: 'Destination', value: selected.destinationMasked },
            { label: 'Environment', value: 'Test — simulated payout, no real money' },
            { label: 'Audit entry', value: 'Created on confirm' },
          ]}
          onConfirm={(reason) => {
            if (selected.status !== 'Eligible') {
              setActionInvalid(
                'A dispute was opened on this order. The payout returned to On Hold. Your process request was not executed.',
              );
              setConfirm(null);
              return;
            }
            const stamp = stampNow();
            const by = actorLabel();
            patchPayout(selected.id, {
              status: 'Processing',
              headerStatus: 'Processing',
              processingAt: stamp,
              processingBy: session?.name ?? 'Staff',
              flash: `Submitted to provider · ${stamp}`,
              history: appendHistory(selected, {
                id: `proc-${Date.now()}`,
                at: stamp,
                title: 'Submitted to provider',
                detail: `${by} · ${reason}`,
              }),
            });
            show(`Processing ${selected.id}`);
            setConfirm(null);
          }}
        />
      ) : null}

      {confirm === 'hold' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={`Place hold on ${selected.id}`}
          description="Hold stops payout execution until Trust & Safety or Finance clears the case."
          confirmLabel="Place hold"
          reasonLabel="Internal hold reason"
          reasonPlaceholder="Why this payout must wait…"
          onConfirm={(reason) => {
            const stamp = stampNow();
            const by = actorLabel();
            patchPayout(selected.id, {
              status: 'On Hold',
              headerStatus: 'On Hold',
              holdReason: reason,
              flash: `Hold placed · ${stamp}`,
              history: appendHistory(selected, {
                id: `hold-${Date.now()}`,
                at: stamp,
                title: 'Hold placed',
                detail: `${by} · ${reason}`,
              }),
            });
            show(`Hold placed on ${selected.id}`);
            setConfirm(null);
          }}
        />
      ) : null}

      {(confirm === 'note' || confirm === 'maintain') && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={confirm === 'maintain' ? 'Maintain hold' : 'Add internal note'}
          description={
            confirm === 'maintain'
              ? `Keep hold on ${selected.id}. Sellers see only the safe hold wording.`
              : `Note stays on ${selected.id}. Sellers never see this.`
          }
          confirmLabel={confirm === 'maintain' ? 'Maintain hold' : 'Save note'}
          reasonLabel={confirm === 'maintain' ? 'Case note' : 'Internal note'}
          reasonPlaceholder="Context for the next reviewer…"
          defaultReason={noteDraft}
          onConfirm={(reason) => {
            const stamp = stampNow();
            const by = actorLabel();
            patchPayout(selected.id, {
              flash: confirm === 'maintain' ? `Hold maintained · ${stamp}` : `Note saved · ${stamp}`,
              history: appendHistory(selected, {
                id: `nt-${Date.now()}`,
                at: stamp,
                title: confirm === 'maintain' ? 'Hold maintained' : 'Internal note added',
                detail: `${by} · ${reason}`,
              }),
            });
            show(confirm === 'maintain' ? 'Hold maintained' : 'Internal note saved');
            setConfirm(null);
          }}
        />
      ) : null}
    </>
  );
}
