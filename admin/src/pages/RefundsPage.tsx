import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, roleLabel } from '@/auth/AuthContext';
import { useBleedSelection } from '@/hooks/use-bleed-selection';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { ExpandableListHeader, ExpandableListRow } from '@/components/admin/expandable-list-row';
import { FilterChips } from '@/components/admin/filter-chips';
import { CopyableId } from '@/components/admin/copyable-id';
import { ListWindowFooter } from '@/components/admin/list-window-footer';
import { StatusBadge, type StatusTone } from '@/components/admin/status-badge';
import { BleedSplit } from '@/components/layout/bleed-split';
import { usePageChrome } from '@/components/layout/shell-chrome';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatNaira, mockRefunds, type MockRefund } from '@/data/mock';
import { useListWindow } from '@/hooks/use-list-window';
import { useToast } from '@/hooks/use-toast';
import { canAct, ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

type QueueFilter = 'awaiting' | 'ready' | 'processing' | 'completed' | 'uncertain';
type ConfirmKind = 'execute' | 'note' | 'retry' | null;
type DeliveryChoice = 'include' | 'exclude' | null;

type RefundOverride = {
  status?: MockRefund['status'];
  deliveryStatus?: MockRefund['deliveryStatus'];
  totalFinal?: number;
  totalLabel?: string;
  history?: MockRefund['history'];
  flash?: string | null;
  processingAt?: string;
  processingBy?: string;
  completedAt?: string;
  completedBy?: string;
  needsDeliveryDetermination?: boolean;
  recordStale?: MockRefund['recordStale'] | null;
};

function statusTone(s: MockRefund['status']): StatusTone {
  if (s === 'Awaiting Finance') return 'hold';
  if (s === 'Ready to execute') return 'plum';
  if (s === 'Processing') return 'neutral';
  if (s === 'Completed') return 'clear';
  if (s === 'Status uncertain' || s === 'Failed') return 'risk';
  return 'neutral';
}

function linkedPath(kind: MockRefund['linkedRecords'][number]['kind']) {
  if (kind === 'dispute') return '/disputes';
  if (kind === 'order') return '/orders';
  if (kind === 'payment') return '/payments';
  return '/payouts';
}

export function RefundsPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [queue, setQueue] = useState<QueueFilter>('awaiting');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useBleedSelection(mockRefunds[0]?.id ?? null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [overrides, setOverrides] = useState<Record<string, RefundOverride>>({});
  const [deliveryChoice, setDeliveryChoice] = useState<Record<string, DeliveryChoice>>({});
  const [noteDraft, setNoteDraft] = useState('');
  const [alreadyDone, setAlreadyDone] = useState<string | null>(null);

  const canExecute = session ? canAct(session.role, 'execute_refund') : false;
  const isTs = session?.role === 'trust_safety';
  const isSupport = session?.role === 'support';
  const showAmounts = !isTs && !isSupport;

  const refunds = useMemo(
    () =>
      mockRefunds.map((r) => {
        const o = overrides[r.id];
        if (!o) return r;
        return {
          ...r,
          status: o.status ?? r.status,
          deliveryStatus: o.deliveryStatus ?? r.deliveryStatus,
          totalFinal: o.totalFinal ?? r.totalFinal,
          totalLabel: o.totalLabel ?? r.totalLabel,
          history: o.history ?? r.history,
          processingAt: o.processingAt ?? r.processingAt,
          processingBy: o.processingBy ?? r.processingBy,
          completedAt: o.completedAt ?? r.completedAt,
          completedBy: o.completedBy ?? r.completedBy,
          needsDeliveryDetermination:
            o.needsDeliveryDetermination ?? r.needsDeliveryDetermination,
          recordStale: o.recordStale === null ? undefined : (o.recordStale ?? r.recordStale),
        };
      }),
    [overrides],
  );

  const awaitingCount = refunds.filter((r) => r.status === 'Awaiting Finance').length;

  usePageChrome({
    title: 'Refunds',
    subtitle: `${awaitingCount} awaiting Finance · origins: approved cancellation or buyer-win dispute only`,
    search,
    onSearchChange: setSearch,
    searchPlaceholder: 'Refund, order or buyer',
    bleed: true,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return refunds.filter((r) => {
      if (queue === 'awaiting' && r.status !== 'Awaiting Finance') return false;
      if (queue === 'ready' && r.status !== 'Ready to execute') return false;
      if (queue === 'processing' && r.status !== 'Processing') return false;
      if (queue === 'completed' && r.status !== 'Completed') return false;
      if (queue === 'uncertain' && r.status !== 'Status uncertain' && r.status !== 'Failed') return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.orderId.toLowerCase().includes(q) ||
        r.buyer.toLowerCase().includes(q) ||
        r.origin.toLowerCase().includes(q)
      );
    });
  }, [refunds, queue, search]);

  const listWindow = useListWindow(rows);

  const selected = refunds.find((r) => r.id === selectedId) ?? null;
  const selectedFlash = selected ? overrides[selected.id]?.flash : null;
  const choice = selected ? deliveryChoice[selected.id] ?? null : null;

  const derivedTotal = selected
    ? selected.itemAmount +
      (selected.buyerProtectionIncluded ? selected.buyerProtectionAmount : 0) +
      (selected.deliveryStatus === 'include' || choice === 'include'
        ? selected.deliveryAmount
        : selected.deliveryStatus === 'exclude' || choice === 'exclude'
          ? 0
          : 0)
    : 0;

  const totalIsFinal =
    selected &&
    (!selected.needsDeliveryDetermination || choice !== null || selected.deliveryStatus !== 'in_question');

  const canExecuteNow =
    canExecute &&
    selected &&
    (selected.status === 'Ready to execute' ||
      (selected.status === 'Awaiting Finance' && totalIsFinal && choice !== null) ||
      (selected.status === 'Failed' && selected.failedRetryAvailable));

  function patchRefund(id: string, next: RefundOverride) {
    setOverrides((current) => ({
      ...current,
      [id]: { ...current[id], ...next },
    }));
  }

  function appendHistory(refund: MockRefund, entry: MockRefund['history'][number]) {
    return [...(overrides[refund.id]?.history ?? refund.history), entry];
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

  function displayTotal(r: MockRefund) {
    if (r.totalLabel === 'Not final' && (!deliveryChoice[r.id] || r.deliveryStatus === 'in_question')) {
      if (deliveryChoice[r.id]) {
        const t =
          r.itemAmount +
          (r.buyerProtectionIncluded ? r.buyerProtectionAmount : 0) +
          (deliveryChoice[r.id] === 'include' ? r.deliveryAmount : 0);
        return formatNaira(t);
      }
      return 'Not final';
    }
    if (r.totalFinal != null) return formatNaira(r.totalFinal);
    return r.totalLabel;
  }

  const refundDesktopCols =
    'grid-cols-[84px_88px_minmax(0,0.85fr)_minmax(0,1fr)_72px_64px_64px_120px] items-center gap-x-2 py-3.5';

  return (
    <>
      <BleedSplit
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        gridClassName="grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.95fr)]"
        inspectorTitle="Refund"
        list={
          <>
            <div className="space-y-3 border-b border-[#e7dcd2] px-4 py-4">
              <FilterChips
                value={queue}
                onChange={(id) => setQueue(id as QueueFilter)}
                options={[
                  { id: 'awaiting', label: 'Awaiting Finance', count: awaitingCount },
                  { id: 'ready', label: 'Ready to execute' },
                  { id: 'processing', label: 'Processing' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'uncertain', label: 'Failed · uncertain' },
                ]}
              />
              {banner}
            </div>

            <div ref={listWindow.scrollRef} className="min-h-0 flex-1 overflow-auto">
              {rows.length === 0 ? (
                <EmptyState
                  title="No refunds match this filter"
                  description="Origins are approved cancellations or buyer-win disputes only."
                  actionLabel="Reset filters"
                  onAction={() => {
                    setQueue('awaiting');
                    setSearch('');
                  }}
                />
              ) : null}

              {rows.length > 0 ? (
                <>
                  <ExpandableListHeader
                    desktopClassName={refundDesktopCols}
                    columns={
                      <>
                        <span>Refund</span>
                        <span>Order</span>
                        <span>Buyer</span>
                        <span>Origin</span>
                        <span>Item</span>
                        <span>Prot.</span>
                        <span>Deliv.</span>
                        <span>Total · status</span>
                      </>
                    }
                  />
                  {listWindow.visible.map((r) => {
                    const active = r.id === selectedId;
                    const deliveryCell = showAmounts
                      ? r.deliveryStatus === 'in_question'
                        ? 'TBD'
                        : r.deliveryStatus === 'include'
                          ? formatNaira(r.deliveryAmount)
                          : '—'
                      : '—';
                    const protectionCell = showAmounts
                      ? r.buyerProtectionIncluded
                        ? formatNaira(r.buyerProtectionAmount)
                        : '—'
                      : '—';
                    return (
                      <ExpandableListRow
                        key={r.id}
                        selected={active}
                        onSelect={() => {
                          setSelectedId(r.id);
                          setAlreadyDone(null);
                        }}
                        desktopClassName={refundDesktopCols}
                        primary={
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] font-semibold text-plum">{r.id}</span>
                              <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                            </div>
                            <div className="mt-1 truncate text-[12px] text-espresso">@{r.buyer}</div>
                            <div className="mt-0.5 truncate text-[11.5px] text-body">{r.origin}</div>
                          </div>
                        }
                        details={[
                          { label: 'Order', value: <span className="font-mono">{r.orderId}</span> },
                          {
                            label: 'Item',
                            value: showAmounts ? formatNaira(r.itemAmount) : '—',
                          },
                          { label: 'Protection', value: protectionCell },
                          { label: 'Delivery', value: deliveryCell },
                          ...(showAmounts
                            ? [
                                {
                                  label: 'Total',
                                  value: (
                                    <span
                                      className={cn(
                                        'font-semibold tabular-nums',
                                        r.totalLabel === 'Not final' && !deliveryChoice[r.id]
                                          ? 'text-[#8a5a15]'
                                          : 'text-espresso',
                                      )}
                                    >
                                      {displayTotal(r)}
                                    </span>
                                  ),
                                },
                              ]
                            : []),
                        ]}
                      >
                        <span className="font-mono text-[11px] font-semibold text-plum">{r.id}</span>
                        <span className="font-mono text-[11px] text-body">{r.orderId}</span>
                        <span className="truncate text-[12px] text-espresso">@{r.buyer}</span>
                        <span className="truncate text-[11.5px] text-body">{r.origin}</span>
                        <span className="text-[12px] tabular-nums text-espresso">
                          {showAmounts ? formatNaira(r.itemAmount) : '—'}
                        </span>
                        <span className="text-[12px] tabular-nums text-espresso">{protectionCell}</span>
                        <span className="text-[12px] tabular-nums text-espresso">{deliveryCell}</span>
                        <div className="flex flex-col items-start gap-1.5">
                          {showAmounts ? (
                            <span
                              className={cn(
                                'text-[12px] font-semibold tabular-nums',
                                r.totalLabel === 'Not final' && !deliveryChoice[r.id]
                                  ? 'text-[#8a5a15]'
                                  : 'text-espresso',
                              )}
                            >
                              {displayTotal(r)}
                            </span>
                          ) : null}
                          <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                        </div>
                      </ExpandableListRow>
                    );
                  })}
                  <ListWindowFooter {...listWindow} />
                  <p className="border-t border-[#e7dcd2] px-4 py-3 text-[11px] leading-relaxed text-body">
                    Item, Buyer Protection and delivery follow approved policy for each origin. Component eligibility is
                    not a partial-refund feature: the system derives the full refund the policy requires, and Finance
                    cannot type a custom amount.
                  </p>
                </>
              ) : null}
            </div>
          </>
        }
        inspector={
          !selected ? (
            <div className="flex flex-1 items-center justify-center px-6 text-[12.5px] text-body">
              Select a refund to inspect.
            </div>
          ) : (
            <>
              <div className="border-b border-[#e7dcd2] px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CopyableId value={selected.id} variant="display" />
                    <div className="mt-2 text-[12.5px] text-body">
                      {selected.orderId} · buyer @{selected.buyer} · created {selected.createdAt}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge tone={statusTone(selected.status)}>{selected.status}</StatusBadge>
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

                {alreadyDone ? (
                  <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                    <AlertTitle className="text-[12px] text-clear">Refund already executed</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-clear">{alreadyDone}</AlertDescription>
                  </Alert>
                ) : null}

                {selected.recordStale ? (
                  <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                    <AlertTitle className="text-[12px] text-[#8a5a15]">{selected.recordStale.title}</AlertTitle>
                    <AlertDescription className="space-y-2.5 text-[11.5px] text-[#8a5a15]">
                      <p>{selected.recordStale.body}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-[#c4a574] bg-panel text-[#8a5a15] hover:bg-[#f5ebe0]"
                        onClick={() => {
                          const stamp = stampNow();
                          const included =
                            selected.itemAmount +
                            (selected.buyerProtectionIncluded ? selected.buyerProtectionAmount : 0) +
                            selected.deliveryAmount;
                          patchRefund(selected.id, {
                            recordStale: null,
                            deliveryStatus: 'include',
                            needsDeliveryDetermination: false,
                            status: 'Ready to execute',
                            totalFinal: included,
                            totalLabel: formatNaira(included),
                            flash: `Reloaded · revalidated ${stamp}`,
                            history: appendHistory(selected, {
                              id: `rl-${Date.now()}`,
                              at: stamp,
                              title: 'Record reloaded',
                              detail: 'Delivery determination from another admin applied · ready to execute',
                            }),
                          });
                          setDeliveryChoice((current) => ({ ...current, [selected.id]: 'include' }));
                          setQueue('ready');
                          setSelectedId(selected.id);
                          show(`Reloaded ${selected.id}`);
                        }}
                      >
                        Reload
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}

                {(isTs || isSupport) && !canExecute ? (
                  <Alert className="rounded-[5px] border-dashed border-[#d4c8bc] bg-transparent">
                    <Lock className="size-3.5 text-body" />
                    <AlertTitle className="text-[11px] font-semibold text-espresso">Permission-limited</AlertTitle>
                    <AlertDescription className="text-[11px] text-body">
                      Refund execution belongs to Finance and Super Admin. Customer Support and Trust & Safety see
                      status only, and the module is not in their navigation.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {isTs ? (
                  <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3 text-[12.5px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-body">Refund status</span>
                      <span className="font-semibold text-espresso">
                        {selected.id} · {selected.status}
                      </span>
                    </div>
                    {selected.decisionId ? (
                      <div className="mt-2 flex justify-between gap-2">
                        <span className="text-body">My decision</span>
                        <span className="font-semibold text-espresso">
                          {selected.decisionId} · refund buyer
                        </span>
                      </div>
                    ) : null}
                    <div className="mt-2 flex justify-between gap-2">
                      <span className="text-body">Components & amounts</span>
                      <span className="font-semibold text-body">Not required for this role</span>
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                      You can see that the decision reached Finance. There is no control over execution, retries or
                      amounts.
                    </p>
                  </div>
                ) : null}

                {showAmounts ? (
                  <>
                    <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3">
                      <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                        Why this refund exists
                      </div>
                      <div className="mt-2 space-y-1.5 text-[12.5px]">
                        <div className="flex justify-between gap-2">
                          <span className="text-body">Origin</span>
                          <span className="text-right font-semibold text-espresso">{selected.origin}</span>
                        </div>
                        {selected.decisionId ? (
                          <div className="flex justify-between gap-2">
                            <span className="text-body">Decision</span>
                            <span className="font-semibold text-espresso">{selected.decisionId}</span>
                          </div>
                        ) : null}
                        {selected.decidedBy ? (
                          <div className="flex justify-between gap-2">
                            <span className="text-body">Decided by</span>
                            <span className="text-right font-semibold text-espresso">{selected.decidedBy}</span>
                          </div>
                        ) : null}
                      </div>
                      <p className="mt-2.5 text-[11.5px] leading-relaxed text-body">{selected.whyExists}</p>
                    </div>

                    <div>
                      <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                        Refundable components
                      </div>
                      <div className="overflow-hidden rounded-[8px] border border-[#ebe3da] text-[12.5px]">
                        <div className="flex justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5">
                          <span className="text-body">Item price</span>
                          <span className="font-semibold tabular-nums text-espresso">
                            {formatNaira(selected.itemAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5">
                          <span className="text-body">Buyer Protection</span>
                          <span className="text-right font-semibold text-espresso">
                            {selected.buyerProtectionIncluded
                              ? formatNaira(selected.buyerProtectionAmount)
                              : 'Not included'}
                            {selected.buyerProtectionNote ? (
                              <span className="mt-0.5 block text-[11px] font-normal text-body">
                                {selected.buyerProtectionNote}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5">
                          <span className="text-body">Delivery</span>
                          <span className="text-right font-semibold text-espresso">
                            {selected.deliveryStatus === 'in_question' && !choice
                              ? `${formatNaira(selected.deliveryAmount)} in question`
                              : selected.deliveryStatus === 'include' || choice === 'include'
                                ? formatNaira(selected.deliveryAmount)
                                : 'Excluded'}
                            {selected.deliveryNote && selected.deliveryStatus !== 'in_question' ? (
                              <span className="mt-0.5 block text-[11px] font-normal text-body">
                                {selected.deliveryNote}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 bg-[#fbf7f2] px-3 py-2.5">
                          <span className="font-semibold text-espresso">Total refundable</span>
                          <span
                            className={cn(
                              'text-[16px] font-semibold tabular-nums',
                              totalIsFinal ? 'text-espresso' : 'text-[#8a5a15]',
                            )}
                          >
                            {totalIsFinal ? formatNaira(derivedTotal || selected.totalFinal || 0) : 'Not final'}
                          </span>
                        </div>
                      </div>
                      {!totalIsFinal ? (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-body">
                          Item and Buyer Protection are refundable for this buyer win, but delivery depends on a
                          recorded determination. Finance cannot type an amount.
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : null}

                {showAmounts && selected.needsDeliveryDetermination && selected.deliveryStatus === 'in_question' ? (
                  <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3">
                    <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Delivery determination (required)
                    </div>
                    <div className="mt-3 space-y-2.5">
                      <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] text-espresso">
                        <input
                          type="radio"
                          name={`delivery-${selected.id}`}
                          className="mt-1"
                          checked={choice === 'include'}
                          onChange={() =>
                            setDeliveryChoice((current) => ({ ...current, [selected.id]: 'include' }))
                          }
                        />
                        <span>Delivery cost was not incurred — include {formatNaira(selected.deliveryAmount)}</span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] text-espresso">
                        <input
                          type="radio"
                          name={`delivery-${selected.id}`}
                          className="mt-1"
                          checked={choice === 'exclude'}
                          onChange={() =>
                            setDeliveryChoice((current) => ({ ...current, [selected.id]: 'exclude' }))
                          }
                        />
                        <span>Delivery cost was incurred and policy does not require refund — exclude</span>
                      </label>
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                      A recorded determination, not an amount field. The total follows from the components.
                    </p>
                  </div>
                ) : null}

                {selected.status === 'Processing' ? (
                  <div className="overflow-hidden rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2]">
                    <div className="h-1 bg-plum" />
                    <div className="px-3 py-3">
                      <div className="text-[12.5px] font-semibold text-espresso">Submitted to the provider</div>
                      <p className="mt-1 text-[11.5px] text-body">
                        {selected.processingAt} by {selected.processingBy}. Awaiting provider confirmation — the
                        record cannot be executed again while processing.
                      </p>
                    </div>
                  </div>
                ) : null}

                {selected.status === 'Completed' ? (
                  <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                    <AlertTitle className="text-[12px] text-clear">
                      {showAmounts && selected.totalFinal
                        ? `${formatNaira(selected.totalFinal)} refunded to @${selected.buyer}`
                        : 'Refund completed'}
                    </AlertTitle>
                    <AlertDescription className="text-[11.5px] text-clear">
                      Verified complete {selected.completedAt} — executed by {selected.completedBy}. Origin retained.
                      Original payment unchanged. Order history preserved.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.status === 'Status uncertain' ? (
                  <div className="space-y-2">
                    <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                      <AlertTitle className="text-[12px] text-[#8a5a15]">Refund was not confirmed</AlertTitle>
                      <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                        Verify provider status before retrying. Issuing another refund risks refunding the buyer
                        twice.
                      </AlertDescription>
                    </Alert>
                    <div className="flex flex-col gap-2">
                      <Button type="button" variant="outline" size="sm" className="border-risk text-risk">
                        Verify provider status
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled>
                        Retry refund — unavailable until status confirmed
                      </Button>
                    </div>
                  </div>
                ) : null}

                {selected.status === 'Failed' ? (
                  <div className="space-y-2">
                    <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                      <AlertTitle className="text-[12px] text-risk">Provider confirmed the refund failed</AlertTitle>
                      <AlertDescription className="text-[11.5px] text-risk">
                        Retry is available now that the outcome is confirmed. Each attempt is recorded separately.
                      </AlertDescription>
                    </Alert>
                    {canExecute && selected.failedRetryAvailable ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirm('retry')}
                      >
                        Retry refund
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {showAmounts ? (
                  <div>
                    <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Linked records
                    </div>
                    <div className="overflow-hidden rounded-[8px] border border-[#ebe3da]">
                      {selected.linkedRecords.map((r) => (
                        <div
                          key={`${r.kind}-${r.id}`}
                          className="flex items-center justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5 last:border-0"
                        >
                          <div>
                            <div className="font-mono text-[11px] font-semibold text-espresso">{r.id}</div>
                            <div className="text-[11px] text-body">{r.label}</div>
                          </div>
                          <Link
                            to={linkedPath(r.kind)}
                            className="text-[11px] font-semibold text-plum hover:underline"
                          >
                            {r.openLabel}
                          </Link>
                        </div>
                      ))}
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
              </div>

              <div className="border-t border-[#e7dcd2] bg-[#fbf7f2] px-5 py-4">
                <div className="mb-2.5 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                  Actions · {session ? ROLE_LABELS[session.role] : 'Staff'}
                </div>

                {canExecute ? (
                  <div className="flex flex-col gap-2">
                    {selected.status === 'Awaiting Finance' && selected.needsDeliveryDetermination && !choice ? (
                      <Button type="button" variant="outline" className="w-full" disabled>
                        Execute refund — record the delivery determination first
                      </Button>
                    ) : canExecuteNow ||
                      (selected.status === 'Awaiting Finance' && choice) ||
                      selected.status === 'Ready to execute' ? (
                      <Button
                        type="button"
                        className="w-full bg-[#3e2b36] text-panel hover:bg-[#2f2029]"
                        disabled={selected.status === 'Processing'}
                        onClick={() => {
                          if (selected.status === 'Completed') {
                            setAlreadyDone(
                              `Executed by ${selected.completedBy} at ${selected.completedAt}. Your submission was not applied — no second refund was sent.`,
                            );
                            return;
                          }
                          setConfirm('execute');
                        }}
                      >
                        Execute refund — review & confirm
                      </Button>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNoteDraft('');
                          setConfirm('note');
                        }}
                      >
                        Add internal note
                      </Button>
                      {selected.decisionId ? (
                        <Button type="button" variant="outline" size="sm" asChild>
                          <Link to="/disputes">Open decision</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNoteDraft('');
                        setConfirm('note');
                      }}
                    >
                      Add internal note
                    </Button>
                    {selected.decisionId ? (
                      <Button type="button" variant="outline" size="sm" asChild>
                        <Link to="/disputes">Open decision</Link>
                      </Button>
                    ) : null}
                  </div>
                )}

                <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                  Execution always opens a review step. No one-click refund, no custom amount, no partial refund.
                </p>
              </div>
            </>
          )
        }
      />

      {(confirm === 'execute' || confirm === 'retry') && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={`Execute refund ${selected.id}?`}
          description="Review the buyer, order and components before execution. The amount is derived by policy and cannot be edited."
          confirmLabel="Execute refund"
          destructive
          requireCheckbox
          checkboxLabel="I have reviewed the buyer, order and components for this refund."
          reasonLabel="Context (recorded)"
          reasonPlaceholder="Approved refund execution — components reviewed."
          defaultReason="Approved refund execution — components reviewed."
          metaRows={[
            { label: 'Buyer', value: `@${selected.buyer}` },
            { label: 'Order', value: `${selected.orderId} · ${selected.orderStatusLabel}` },
            { label: 'Origin', value: selected.originDetail },
            { label: 'Original payment', value: `${selected.paymentId} · confirmed` },
            {
              label: 'Total refund',
              value: formatNaira(
                derivedTotal ||
                  selected.totalFinal ||
                  selected.itemAmount +
                    (selected.buyerProtectionIncluded ? selected.buyerProtectionAmount : 0) +
                    (choice === 'include' || selected.deliveryStatus === 'include'
                      ? selected.deliveryAmount
                      : 0),
              ),
            },
            { label: 'Environment', value: 'Test — simulated refund, no real money' },
            { label: 'Audit entry', value: 'Created on confirm' },
          ]}
          onConfirm={(reason) => {
            if (selected.status === 'Completed') {
              setAlreadyDone(
                `Executed by ${selected.completedBy} at ${selected.completedAt}. Your submission was not applied — no second refund was sent.`,
              );
              setConfirm(null);
              return;
            }
            const stamp = stampNow();
            const by = actorLabel();
            const total =
              derivedTotal ||
              selected.totalFinal ||
              selected.itemAmount +
                (selected.buyerProtectionIncluded ? selected.buyerProtectionAmount : 0) +
                (choice === 'include' || selected.deliveryStatus === 'include' ? selected.deliveryAmount : 0);
            patchRefund(selected.id, {
              status: 'Processing',
              deliveryStatus: choice ?? selected.deliveryStatus,
              needsDeliveryDetermination: false,
              totalFinal: total,
              totalLabel: formatNaira(total),
              processingAt: stamp,
              processingBy: session?.name ?? 'Staff',
              flash: `Submitted to provider · ${stamp}`,
              history: appendHistory(selected, {
                id: `ex-${Date.now()}`,
                at: stamp,
                title: confirm === 'retry' ? 'Retry submitted to provider' : 'Submitted to the provider',
                detail: `${by} · ${reason}`,
              }),
            });
            show(`Processing ${selected.id}`);
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
            patchRefund(selected.id, {
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
    </>
  );
}
