import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, roleLabel } from '@/auth/AuthContext';
import { AiAdvisory } from '@/components/admin/ai-advisory';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState, ErrorState, LoadingState, OfflineBanner } from '@/components/admin/empty-state';
import { FilterChips } from '@/components/admin/filter-chips';
import { StatusBadge, type StatusTone } from '@/components/admin/status-badge';
import { usePageChrome } from '@/components/layout/shell-chrome';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatNaira, mockPayments, type MockPayment } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { canAct, ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

type DemoState = 'ready' | 'loading' | 'empty' | 'error' | 'offline';
type QueueFilter = 'needs_attention' | 'uncertain' | 'failed' | 'duplicate' | 'successful';
type ConfirmKind = 'verify' | 'note' | 'escalate' | null;

type PaymentOverride = {
  history?: MockPayment['history'];
  flash?: string | null;
  verification?: MockPayment['verification'];
};

function statusTone(s: MockPayment['status']): StatusTone {
  if (s === 'Successful') return 'clear';
  if (s === 'Status uncertain' || s === 'Initiated') return 'hold';
  if (s === 'Duplicate risk' || s === 'Confirmed failed') return 'risk';
  return 'neutral';
}

export function PaymentsPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [queue, setQueue] = useState<QueueFilter>('needs_attention');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(mockPayments[0]?.id ?? null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [demoState, setDemoState] = useState<DemoState>('ready');
  const [overrides, setOverrides] = useState<Record<string, PaymentOverride>>({});
  const [noteDraft, setNoteDraft] = useState('');

  const canFinanceAct = session ? canAct(session.role, 'execute_refund') || session.role === 'finance' || session.role === 'super_admin' : false;
  const isSupport = session?.role === 'support';
  const isTs = session?.role === 'trust_safety';
  const showAmounts = !isSupport && !isTs;
  const canAccessPaymentsNav = canFinanceAct || session?.role === 'super_admin';

  const payments = useMemo(
    () =>
      mockPayments.map((p) => {
        const o = overrides[p.id];
        if (!o) return p;
        return {
          ...p,
          history: o.history ?? p.history,
          verification: o.verification ?? p.verification,
        };
      }),
    [overrides],
  );

  const needsAttentionCount = payments.filter((p) => p.needsAttention).length;
  const uncertainCount = payments.filter((p) => p.status === 'Status uncertain').length;
  const duplicateCount = payments.filter((p) => p.status === 'Duplicate risk').length;

  usePageChrome({
    title: 'Payments',
    subtitle: `${needsAttentionCount} needing attention · ${uncertainCount} awaiting verification · ${duplicateCount} possible duplicate`,
    search,
    onSearchChange: setSearch,
    searchPlaceholder: 'Payment, order or buyer',
    bleed: true,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (queue === 'needs_attention' && !p.needsAttention) return false;
      if (queue === 'uncertain' && p.status !== 'Status uncertain') return false;
      if (queue === 'failed' && p.status !== 'Confirmed failed') return false;
      if (queue === 'duplicate' && p.status !== 'Duplicate risk') return false;
      if (queue === 'successful' && p.status !== 'Successful') return false;
      if (!q) return true;
      return (
        p.id.toLowerCase().includes(q) ||
        p.orderId.toLowerCase().includes(q) ||
        p.buyer.toLowerCase().includes(q) ||
        p.itemTitle.toLowerCase().includes(q)
      );
    });
  }, [payments, queue, search]);

  const selected = payments.find((p) => p.id === selectedId) ?? null;
  const selectedFlash = selected ? overrides[selected.id]?.flash : null;
  const isDuplicateCluster =
    selected?.status === 'Duplicate risk' ||
    (selected?.relatedAttempts.filter((a) => a.kind === 'payment').length ?? 0) >= 2;

  function patchPayment(id: string, next: PaymentOverride) {
    setOverrides((current) => ({
      ...current,
      [id]: { ...current[id], ...next },
    }));
  }

  function appendHistory(payment: MockPayment, entry: MockPayment['history'][number]) {
    return [...(overrides[payment.id]?.history ?? payment.history), entry];
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

  return (
    <>
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1.4fr)_minmax(360px,0.95fr)]">
        <div className="flex min-h-0 min-w-0 flex-col border-r border-[#dccfc4] bg-panel">
          <div className="space-y-3 border-b border-[#e7dcd2] px-4 py-4">
            <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
              Screen 9 preview states
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
            <FilterChips
              value={queue}
              onChange={(id) => setQueue(id as QueueFilter)}
              options={[
                { id: 'needs_attention', label: 'Needs attention', count: needsAttentionCount },
                { id: 'uncertain', label: 'Status uncertain', count: uncertainCount },
                { id: 'failed', label: 'Confirmed failed' },
                { id: 'duplicate', label: 'Duplicate risk', count: duplicateCount },
                { id: 'successful', label: 'Successful' },
              ]}
            />
            {banner}
            {demoState === 'offline' ? <OfflineBanner onRetry={() => setDemoState('ready')} /> : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {demoState === 'loading' ? <LoadingState label="Loading payments…" /> : null}

            {demoState === 'error' ? (
              <ErrorState
                title="Could not load · no status was changed"
                description="Nothing was changed. Retry when the connection is stable."
                onRetry={() => setDemoState('ready')}
              />
            ) : null}

            {demoState === 'empty' || (demoState === 'ready' && rows.length === 0) ? (
              <EmptyState
                title="No payments match this filter"
                description="Try a different filter or search."
                actionLabel="Reset filters"
                onAction={() => {
                  setQueue('needs_attention');
                  setSearch('');
                  setDemoState('ready');
                }}
              />
            ) : null}

            {(demoState === 'ready' || demoState === 'offline') && rows.length > 0 ? (
              <>
                <div className="sticky top-0 z-[1] grid grid-cols-[88px_88px_minmax(0,1.3fr)_72px_64px_64px_72px_120px] gap-x-2 border-b border-[#e7dcd2] bg-[#fbf5ef] px-4 py-3 text-[9.5px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                  <span>Payment</span>
                  <span>Order</span>
                  <span>Buyer · item</span>
                  <span>Item</span>
                  <span>Deliv.</span>
                  <span>Prot.</span>
                  <span>Total</span>
                  <span>Status</span>
                </div>
                {rows.map((p) => {
                  const active = p.id === selectedId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={demoState === 'offline'}
                      onClick={() => setSelectedId(p.id)}
                      className={cn(
                        'grid w-full grid-cols-[88px_88px_minmax(0,1.3fr)_72px_64px_64px_72px_120px] items-center gap-x-2 border-b border-[#f0e7de] px-4 py-3.5 text-left last:border-0',
                        active ? 'bg-[#f9f1ea]' : 'bg-panel hover:bg-[#fbf5ef]',
                        demoState === 'offline' && 'opacity-60',
                      )}
                    >
                      <span className="font-mono text-[11px] font-semibold text-plum">{p.id}</span>
                      <span className="font-mono text-[11px] text-body">{p.orderId}</span>
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] font-semibold text-espresso">@{p.buyer}</div>
                        <div className="mt-0.5 truncate text-[11.5px] text-body">{p.itemTitle}</div>
                      </div>
                      <span className="text-[12px] tabular-nums text-espresso">
                        {showAmounts ? formatNaira(p.itemPrice) : '—'}
                      </span>
                      <span className="text-[12px] tabular-nums text-espresso">
                        {showAmounts ? formatNaira(p.deliveryFee) : '—'}
                      </span>
                      <span className="text-[12px] tabular-nums text-espresso">
                        {showAmounts ? formatNaira(p.buyerProtection) : '—'}
                      </span>
                      <span className="text-[12px] font-semibold tabular-nums text-espresso">
                        {showAmounts ? formatNaira(p.amount) : '—'}
                      </span>
                      <StatusBadge tone={statusTone(p.status)}>{p.status}</StatusBadge>
                    </button>
                  );
                })}
                <p className="border-t border-[#e7dcd2] px-4 py-3 text-[11px] leading-relaxed text-body">
                  Buyer Protection is 5% of the item price, minimum ₦300 and maximum ₦2,500, and is never calculated
                  on delivery. Seller deductions do not appear in buyer payment amounts.
                </p>
              </>
            ) : null}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col bg-panel">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center px-6 text-[12.5px] text-body">
              Select a payment to inspect.
            </div>
          ) : demoState === 'error' ? (
            <div className="flex flex-1 flex-col justify-center gap-3 px-5">
              <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                <AlertTitle className="text-[12px] text-risk">Could not load · no status was changed</AlertTitle>
                <AlertDescription className="text-[11.5px] text-risk">
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
                      {selected.orderId} · @{selected.buyer} · {selected.placedLabel}
                    </div>
                  </div>
                  <StatusBadge tone={statusTone(selected.status)}>{selected.status}</StatusBadge>
                </div>
                {showAmounts ? (
                  <div className="mt-3 text-right">
                    <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Total attempted
                    </div>
                    <div className="font-display text-[28px] leading-none tabular-nums text-espresso">
                      {formatNaira(selected.amount)}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-4">
                {selectedFlash ? (
                  <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                    <AlertTitle className="text-[12px] text-clear">Recorded</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-clear">{selectedFlash}</AlertDescription>
                  </Alert>
                ) : null}

                {selected.recordStale ? (
                  <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                    <AlertTitle className="text-[12px] text-[#8a5a15]">{selected.recordStale.title}</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                      {selected.recordStale.body}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {demoState === 'offline' ? (
                  <Alert className="rounded-[5px] border-border-soft bg-[#f3ede6]">
                    <AlertTitle className="text-[12px] text-espresso">Offline</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-body">
                      Verification requests are unavailable.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {!canAccessPaymentsNav && (isTs || isSupport) ? (
                  <Alert className="rounded-[5px] border-dashed border-[#d4c8bc] bg-transparent">
                    <Lock className="size-3.5 text-body" />
                    <AlertTitle className="text-[11px] font-semibold text-espresso">Permission-limited</AlertTitle>
                    <AlertDescription className="text-[11px] text-body">
                      Payments is not part of the Trust & Safety or Customer Support navigation.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {isSupport ? (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <StatusBadge tone="plum">Customer Support</StatusBadge>
                    </div>
                    <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3 text-[12.5px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-body">Order</span>
                        <span className="font-semibold text-espresso">{selected.orderId}</span>
                      </div>
                      <div className="mt-2 flex justify-between gap-2">
                        <span className="text-body">Payment</span>
                        <span className="font-semibold text-espresso">Being confirmed</span>
                      </div>
                      <div className="mt-2 flex justify-between gap-2">
                        <span className="text-body">Amounts & references</span>
                        <span className="font-semibold text-body">Restricted</span>
                      </div>
                    </div>
                    <Alert className="rounded-[5px] border-dashed border-[#d4c8bc] bg-transparent">
                      <AlertTitle className="text-[12px] text-espresso">What to tell the customer</AlertTitle>
                      <AlertDescription className="text-[11.5px] text-body">
                        “We’re confirming your payment. Please don’t pay again.” Support cannot manually change
                        payment statuses.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : null}

                {selected.attentionTitle ? (
                  <Alert
                    className={cn(
                      'rounded-[5px]',
                      selected.status === 'Duplicate risk' || selected.status === 'Confirmed failed'
                        ? 'border-risk-border bg-risk-bg'
                        : 'border-hold-border bg-hold-bg',
                    )}
                  >
                    <AlertTitle
                      className={cn(
                        'text-[12px]',
                        selected.status === 'Duplicate risk' || selected.status === 'Confirmed failed'
                          ? 'text-risk'
                          : 'text-[#8a5a15]',
                      )}
                    >
                      {selected.attentionTitle}
                    </AlertTitle>
                    {selected.attentionBody ? (
                      <AlertDescription
                        className={cn(
                          'text-[11.5px]',
                          selected.status === 'Duplicate risk' || selected.status === 'Confirmed failed'
                            ? 'text-risk'
                            : 'text-[#8a5a15]',
                        )}
                      >
                        {selected.attentionBody}
                      </AlertDescription>
                    ) : null}
                  </Alert>
                ) : null}

                {isDuplicateCluster && showAmounts ? (
                  <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3 text-[12.5px]">
                    <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Duplicate-attempt investigation
                    </div>
                    {selected.relatedAttempts
                      .filter((a) => a.kind === 'payment')
                      .map((a) => (
                        <div key={a.id} className="flex justify-between gap-2 border-b border-[#f0e7de] py-2 last:border-0">
                          <span className="font-mono text-[11px] font-semibold text-espresso">
                            {a.id} · {a.at}
                          </span>
                          <span
                            className={cn(
                              'text-[11.5px] font-semibold',
                              a.status.includes('Duplicate') ? 'text-risk' : 'text-[#8a5a15]',
                            )}
                          >
                            {a.status}
                          </span>
                        </div>
                      ))}
                    <div className="mt-2 flex justify-between gap-2">
                      <span className="text-body">Amounts</span>
                      <span className="font-semibold text-espresso">Identical · {formatNaira(selected.amount)}</span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-body">
                      No automated refunds or deletions. Human verification is required.
                    </p>
                  </div>
                ) : null}

                {selected.status === 'Confirmed failed' ? (
                  <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3 text-[12.5px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-body">Order</span>
                      <span className="font-semibold text-espresso">
                        {selected.orderId} · {selected.orderStatusLabel ?? 'Not yet Paid'}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between gap-2">
                      <span className="text-body">Provider result</span>
                      <span className="font-semibold text-espresso">
                        Failed · confirmed {selected.failedConfirmedAt}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between gap-2">
                      <span className="text-body">Retry by Finance</span>
                      <span className="font-semibold text-body">Not available</span>
                    </div>
                  </div>
                ) : null}

                {selected.status === 'Successful' ? (
                  <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                    <AlertTitle className="text-[12px] text-clear">
                      {showAmounts ? `${formatNaira(selected.amount)} confirmed` : 'Payment confirmed'}
                    </AlertTitle>
                    <AlertDescription className="text-[11.5px] text-clear">
                      Verified provider result — order advanced to Paid by the workflow, not by an admin.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.status === 'Initiated' ? (
                  <Alert className="rounded-[5px] border-border-soft bg-[#f3ede6]">
                    <AlertTitle className="text-[12px] text-espresso">Attempt in progress</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-body">
                      No result yet. Nothing to act on; the order is not Paid.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.status === 'Cancelled' ? (
                  <Alert className="rounded-[5px] border-border-soft bg-[#f3ede6]">
                    <AlertTitle className="text-[12px] text-espresso">Checkout window closed</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-body">
                      The buyer did not complete the attempt. No order was created as paid.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.linkedRefundId ? (
                  <Alert className="rounded-[5px] border-border-soft bg-[#f3ede6]">
                    <AlertTitle className="text-[12px] text-espresso">
                      {selected.linkedRefundId} · {selected.linkedRefundLabel}
                    </AlertTitle>
                    <AlertDescription className="text-[11.5px] text-body">
                      Original payment retained. Refunds are executed in the Refunds module.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.aiSummary && !isSupport ? (
                  <AiAdvisory
                    kind="SUMMARY"
                    recommendation={
                      selected.aiNextStep ? <>Recommended: {selected.aiNextStep}.</> : undefined
                    }
                  >
                    {selected.aiSummary}
                  </AiAdvisory>
                ) : null}

                {showAmounts ? (
                  <div>
                    <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Amount attempted
                    </div>
                    <div className="overflow-hidden rounded-[8px] border border-[#ebe3da] text-[12.5px]">
                      <div className="flex justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5">
                        <span className="text-body">Item price</span>
                        <span className="font-semibold tabular-nums text-espresso">
                          {formatNaira(selected.itemPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5">
                        <span className="text-body">Delivery · {selected.deliveryMethod}</span>
                        <span className="font-semibold tabular-nums text-espresso">
                          {formatNaira(selected.deliveryFee)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5">
                        <span className="text-body">Buyer Protection</span>
                        <span className="font-semibold tabular-nums text-espresso">
                          {formatNaira(selected.buyerProtection)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 bg-[#fbf7f2] px-3 py-2.5">
                        <span className="font-semibold text-espresso">Total attempted</span>
                        <span className="text-[16px] font-semibold tabular-nums text-espresso">
                          {formatNaira(selected.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Payment timeline
                  </div>
                  <ul className="divide-y divide-[#ebe3da] rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3">
                    {selected.timeline.map((event) => (
                      <li
                        key={event.id}
                        className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 py-2.5 text-[12.5px]"
                      >
                        <span className="tabular-nums text-body">{event.at}</span>
                        <span className="text-espresso">
                          {event.title}
                          {event.detail ? ` · ${event.detail}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {showAmounts ? (
                  <div>
                    <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Provider
                    </div>
                    <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3 text-[12.5px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-body">Reference</span>
                        <span className="font-semibold text-espresso">{selected.providerRefMasked}</span>
                      </div>
                      <div className="mt-2 flex justify-between gap-2">
                        <span className="text-body">Verification</span>
                        <span
                          className={cn(
                            'font-semibold',
                            selected.verification === 'Pending' ? 'text-[#8a5a15]' : 'text-espresso',
                            selected.verification === 'Verified' && 'text-clear',
                            selected.verification === 'Failed' && 'text-risk',
                          )}
                        >
                          {selected.verification}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between gap-2">
                        <span className="text-body">Environment</span>
                        <span className="text-right text-[11.5px] text-body">{selected.environment}</span>
                      </div>
                      <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                        Card and bank credentials are never displayed in this console. Production provider
                        configuration is still subject to technical confirmation.
                      </p>
                    </div>
                  </div>
                ) : null}

                {selected.relatedAttempts.length > 0 ? (
                  <div>
                    <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Related attempts on {selected.orderId}
                    </div>
                    <ul className="divide-y divide-[#ebe3da] rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3">
                      {selected.relatedAttempts.map((a) => (
                        <li key={`${a.kind}-${a.id}`} className="flex items-center justify-between gap-2 py-2.5">
                          <div className="min-w-0">
                            <div className="font-mono text-[11px] font-semibold text-espresso">
                              {a.id}
                              {a.at ? ` · ${a.at}` : ''}
                              {a.kind === 'payment' && showAmounts ? ` · ${formatNaira(a.amount)}` : ''}
                            </div>
                          </div>
                          <span
                            className={cn(
                              'shrink-0 text-[11.5px] font-semibold',
                              a.status.includes('Duplicate') || a.status.includes('Failed')
                                ? 'text-risk'
                                : a.status.includes('Uncertain')
                                  ? 'text-[#8a5a15]'
                                  : 'text-espresso',
                            )}
                          >
                            {a.kind === 'order' ? (a.status.includes('Paid') ? a.status : 'Open order') : a.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Action history
                  </div>
                  {selected.history.length === 0 ? (
                    <p className="text-[12px] text-body">No staff actions yet.</p>
                  ) : (
                    <ul className="divide-y divide-[#ebe3da] rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3">
                      {selected.history.map((event) => (
                        <li key={event.id} className="py-2.5 text-[12.5px] leading-snug text-espresso">
                          <span className="font-semibold">{event.title}</span>
                          <span className="text-body">
                            {' '}
                            · {event.detail ? `${event.detail} · ` : ''}
                            {event.at}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="border-t border-[#e7dcd2] bg-[#fbf7f2] px-5 py-4">
                <div className="mb-2.5 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                  Actions · {session ? ROLE_LABELS[session.role] : 'Staff'}
                </div>

                {isSupport ? (
                  <div className="flex flex-col gap-2">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={demoState === 'offline'}
                      onClick={() => setConfirm('escalate')}
                    >
                      Escalate to Finance
                    </Button>
                  </div>
                ) : canFinanceAct ? (
                  <div className="flex flex-col gap-2">
                    {(selected.status === 'Status uncertain' || selected.status === 'Duplicate risk') &&
                    selected.verification === 'Pending' ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={demoState === 'offline'}
                        onClick={() => setConfirm('verify')}
                      >
                        Request provider verification
                      </Button>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
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
                      <Button type="button" variant="outline" size="sm" asChild>
                        <Link to="/orders">Open order</Link>
                      </Button>
                      {selected.linkedRefundId ? (
                        <Button type="button" variant="outline" size="sm" asChild>
                          <Link to="/refunds">Open refund</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11.5px] text-body">
                    No payment execution controls for this role. Notes only where permitted.
                  </p>
                )}

                <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                  There is no mark-as-paid, mark-as-failed, retry-charge or balance-adjustment control for any role.
                  Payment status is set by verified transaction information only.
                </p>
              </div>
            </>
          )}
        </aside>
      </div>

      {confirm === 'verify' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={`Request verification for ${selected.id}`}
          description="Requests a provider status check. This does not mark the payment paid or failed."
          confirmLabel="Request verification"
          reasonLabel="Context (recorded)"
          reasonPlaceholder="Why verification is needed…"
          defaultReason="No confirmed provider result yet — verify before advising buyer."
          metaRows={[
            { label: 'Payment', value: selected.id },
            { label: 'Order', value: selected.orderId },
            { label: 'Environment', value: selected.environment },
            { label: 'Audit entry', value: 'Created on confirm' },
          ]}
          onConfirm={(reason) => {
            const stamp = stampNow();
            const by = actorLabel();
            patchPayment(selected.id, {
              flash: `Verification requested · ${stamp}`,
              history: appendHistory(selected, {
                id: `vf-${Date.now()}`,
                at: stamp,
                title: 'Verification requested',
                detail: `${by} · no status change · ${reason}`,
              }),
            });
            show(`Verification requested for ${selected.id}`);
            setConfirm(null);
          }}
        />
      ) : null}

      {confirm === 'note' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title="Add internal note"
          description={`Note stays on ${selected.id}. Buyers never see this.`}
          confirmLabel="Save note"
          reasonLabel="Internal note"
          reasonPlaceholder="Context for the next reviewer…"
          defaultReason={noteDraft}
          onConfirm={(reason) => {
            const stamp = stampNow();
            const by = actorLabel();
            patchPayment(selected.id, {
              flash: `Note saved · ${stamp}`,
              history: appendHistory(selected, {
                id: `nt-${Date.now()}`,
                at: stamp,
                title: 'Internal note added',
                detail: `${by} · ${reason}`,
              }),
            });
            show('Internal note saved');
            setConfirm(null);
          }}
        />
      ) : null}

      {confirm === 'escalate' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title="Escalate to Finance"
          description={`Route ${selected.id} / ${selected.orderId} to Finance for provider verification.`}
          confirmLabel="Escalate"
          reasonLabel="Escalation reason"
          reasonPlaceholder="Why Finance needs to review this…"
          onConfirm={(reason) => {
            const stamp = stampNow();
            const by = actorLabel();
            patchPayment(selected.id, {
              flash: `Escalated to Finance · ${stamp}`,
              history: appendHistory(selected, {
                id: `es-${Date.now()}`,
                at: stamp,
                title: 'Escalated to Finance',
                detail: `${by} · ${reason}`,
              }),
            });
            show('Escalated to Finance');
            setConfirm(null);
          }}
        />
      ) : null}
    </>
  );
}
