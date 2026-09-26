import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  escalateAdminOrder,
  fetchAdminOrder,
  fetchAdminOrders,
  noteAdminOrder,
  type AdminOrderCounts,
  type AdminOrderDto,
} from '@/api/orders';
import type { AdminOrderFlag } from '@/types/domain';
import { useAuth } from '@/auth/AuthContext';
import { useBleedSelection } from '@/hooks/use-bleed-selection';
import { AiAdvisory } from '@/components/admin/ai-advisory';
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
import { useListWindow } from '@/hooks/use-list-window';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/roles';
import { Lock } from 'lucide-react';
import { formatNaira } from '@/lib/format';

type QueueFilter =
  | 'needs_assistance'
  | 'Paid'
  | 'Awaiting dispatch'
  | 'In transit'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled';
type ConfirmKind = 'note' | 'escalate' | null;

type OrderOverride = {
  timeline?: AdminOrderDto['timeline'];
  flash?: string | null;
};

const emptyCounts: AdminOrderCounts = {
  needs_assistance: 0,
  paid: 0,
  awaiting_dispatch: 0,
  in_transit: 0,
  delivered: 0,
  completed: 0,
  cancelled: 0,
};

const FLAG_META: Record<AdminOrderFlag, { label: string; tone: StatusTone }> = {
  dispute: { label: 'Dispute', tone: 'risk' },
  hold: { label: 'Hold', tone: 'hold' },
  cancellable: { label: 'Cancellable', tone: 'plum' },
  payout: { label: 'Payout', tone: 'clear' },
  refund: { label: 'Refund', tone: 'plum' },
  verify: { label: 'Verify', tone: 'hold' },
};

function statusTone(s: AdminOrderDto['status']): StatusTone {
  if (s === 'Completed') return 'clear';
  if (s === 'Disputed' || s === 'Cancelled') return 'risk';
  if (s === 'Delivered' || s === 'In transit') return 'neutral';
  if (s === 'Awaiting dispatch') return 'hold';
  return 'neutral';
}

function paymentTone(s: AdminOrderDto['paymentStatus']): StatusTone {
  return s === 'Uncertain' ? 'hold' : 'clear';
}

function linkedPath(kind: AdminOrderDto['linkedRecords'][number]['kind']) {
  if (kind === 'dispute') return '/disputes';
  if (kind === 'payment') return '/payments';
  if (kind === 'payout') return '/payouts';
  if (kind === 'refund') return '/refunds';
  return '/listings';
}

function linkedActionLabel(
  kind: AdminOrderDto['linkedRecords'][number]['kind'],
  financeOnly: boolean | undefined,
  canSeeFinanceIds: boolean,
) {
  if (kind === 'dispute') return 'Open dispute';
  if (kind === 'listing') return 'Open listing';
  if (financeOnly && !canSeeFinanceIds) return 'Finance only';
  if (kind === 'payment') return 'Open payment';
  if (kind === 'payout') return 'Open payout';
  if (kind === 'refund') return 'Open refund';
  return 'Open';
}

export function OrdersPage() {
  const { session } = useAuth();
  const liveMode = Boolean(session?.accessToken);
  const { banner, show } = useToast();
  const [queue, setQueue] = useState<QueueFilter>('needs_assistance');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useBleedSelection(null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [overrides, setOverrides] = useState<Record<string, OrderOverride>>({});
  const [noteDraft, setNoteDraft] = useState('');
  const [liveOrders, setLiveOrders] = useState<AdminOrderDto[]>([]);
  const [liveCounts, setLiveCounts] = useState<AdminOrderCounts>(emptyCounts);
  const [loading, setLoading] = useState(liveMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const role = session?.role;
  const isSupport = role === 'support';
  const isFinance = role === 'finance';
  const isTs = role === 'trust_safety';
  const isSuper = role === 'super_admin';
  const isTsOrSuper = isTs || isSuper;
  const showAmounts = Boolean(isSupport || isFinance || isSuper);
  const showFinanceIds = Boolean(isFinance || isSuper);
  const showTsFinanceStatus = isTsOrSuper;
  const showDeliveryContext = !isFinance;
  const showDeliveryArea = isTsOrSuper || isSupport;

  const loadLive = useCallback(async () => {
    if (!liveMode) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAdminOrders(queue, search);
      setLiveOrders(data.orders);
      setLiveCounts(data.counts);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load orders');
    } finally {
      setLoading(false);
    }
  }, [liveMode, queue, search]);

  const applyDetail = useCallback((detail: { order: AdminOrderDto }) => {
    setLiveOrders((current) => {
      const idx = current.findIndex((o) => o.id === detail.order.id);
      if (idx === -1) return [detail.order, ...current];
      const next = [...current];
      next[idx] = detail.order;
      return next;
    });
    setOverrides((current) => {
      const next = { ...current };
      delete next[detail.order.id];
      return next;
    });
  }, []);

  const loadSelectedDetail = useCallback(
    async (id: string) => {
      if (!liveMode) return;
      try {
        const detail = await fetchAdminOrder(id);
        applyDetail(detail);
      } catch {
        // keep list row
      }
    },
    [applyDetail, liveMode],
  );

  useEffect(() => {
    if (!liveMode) {
      setLoading(false);
      setLoadError(null);
      setLiveOrders([]);
      return;
    }
    void loadLive();
  }, [liveMode, loadLive]);

  const orders = useMemo(
    () =>
      liveOrders.map((o) => {
        const ov = overrides[o.id];
        if (!ov?.timeline) return o;
        return { ...o, timeline: ov.timeline };
      }),
    [liveOrders, overrides],
  );

  const needsAssistanceCount = liveCounts.needs_assistance;

  usePageChrome({
    title: 'Orders',
    subtitle: `${needsAssistanceCount} needing assistance · read-only lifecycle · note / escalate only`,
    search,
    onSearchChange: setSearch,
    searchPlaceholder: 'Order, buyer or seller',
    bleed: true,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.listing.toLowerCase().includes(q) ||
        o.listingId.toLowerCase().includes(q) ||
        o.buyer.toLowerCase().includes(q) ||
        o.seller.toLowerCase().includes(q) ||
        o.paymentId.toLowerCase().includes(q),
    );
  }, [orders, search]);

  useEffect(() => {
    if (!liveMode || !selectedId) return;
    void loadSelectedDetail(selectedId);
  }, [liveMode, selectedId, loadSelectedDetail]);

  useEffect(() => {
    if (!liveMode || selectedId) return;
    if (rows[0]) setSelectedId(rows[0].id);
  }, [liveMode, rows, selectedId, setSelectedId]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;
  const selectedFlash = selected ? overrides[selected.id]?.flash : null;
  const refundLabel =
    selected?.linkedRecords.find((r) => r.kind === 'refund')?.label?.toLowerCase() ?? '';
  const refundPending = Boolean(
    selected?.refundId &&
      (refundLabel.includes('awaiting') ||
        refundLabel === 'ready' ||
        refundLabel === 'processing' ||
        refundLabel === 'uncertain'),
  );
  const refundCompleted = Boolean(selected?.refundId && refundLabel === 'completed');
  const payoutEligible = Boolean(selected?.status === 'Completed' && selected.flags.includes('payout'));

  const listWindow = useListWindow(rows);

  async function runNote(reason: string) {
    if (!selected || !liveMode) return;
    setActionBusy(true);
    try {
      const detail = await noteAdminOrder(selected.id, reason);
      applyDetail(detail);
      show('Internal note saved');
      setConfirm(null);
      await loadSelectedDetail(selected.id);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not save note');
      setConfirm(null);
    } finally {
      setActionBusy(false);
    }
  }

  async function runEscalate(reason: string) {
    if (!selected || !liveMode) return;
    setActionBusy(true);
    try {
      const detail = await escalateAdminOrder(selected.id, reason);
      applyDetail(detail);
      show('Order escalated');
      setConfirm(null);
      await loadLive();
      await loadSelectedDetail(selected.id);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not escalate');
      setConfirm(null);
    } finally {
      setActionBusy(false);
    }
  }

  const orderDesktopCols =
    'grid-cols-[92px_minmax(0,1.5fr)_104px_112px_112px_minmax(120px,0.95fr)] items-start gap-x-3 py-4';

  return (
    <>
      <BleedSplit
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        gridClassName="grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.95fr)]"
        inspectorTitle="Order"
        list={
          <>
            <div className="space-y-3 border-b border-[#e7dcd2] px-4 py-4">
              <FilterChips
                value={queue}
                onChange={(id) => setQueue(id as QueueFilter)}
                options={[
                  { id: 'needs_assistance', label: 'Needs assistance', count: needsAssistanceCount },
                  {
                    id: 'Paid',
                    label: 'Paid',
                    count: liveMode ? liveCounts.paid : undefined,
                  },
                  {
                    id: 'Awaiting dispatch',
                    label: 'Awaiting dispatch',
                    count: liveMode ? liveCounts.awaiting_dispatch : undefined,
                  },
                  {
                    id: 'In transit',
                    label: 'In transit',
                    count: liveMode ? liveCounts.in_transit : undefined,
                  },
                  {
                    id: 'Delivered',
                    label: 'Delivered',
                    count: liveMode ? liveCounts.delivered : undefined,
                  },
                  {
                    id: 'Completed',
                    label: 'Completed',
                    count: liveMode ? liveCounts.completed : undefined,
                  },
                  {
                    id: 'Cancelled',
                    label: 'Cancelled',
                    count: liveMode ? liveCounts.cancelled : undefined,
                  },
                ]}
              />
              {banner}
              {liveMode && loadError ? (
                <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                  <AlertTitle className="text-[12px] text-risk">Could not load</AlertTitle>
                  <AlertDescription className="text-[11.5px] text-risk">{loadError}</AlertDescription>
                </Alert>
              ) : null}
            </div>

            <div ref={listWindow.scrollRef} className="min-h-0 flex-1 overflow-auto">
              {loading && liveMode ? (
                <p className="px-4 py-8 text-[12.5px] text-body">Loading orders…</p>
              ) : null}

              {!loading && !(loadError && liveMode) && rows.length === 0 ? (
                <EmptyState
                  title="No orders match this filter"
                  description={
                    queue === 'needs_assistance'
                      ? 'Disputes, holds, uncertain payments and open cancellation windows appear here.'
                      : 'Try a different filter or search.'
                  }
                  actionLabel="Reset filters"
                  onAction={() => {
                    setQueue('needs_assistance');
                    setSearch('');
                  }}
                />
              ) : null}

              {!loading && !(loadError && liveMode) && rows.length > 0 ? (
                <>
                  <ExpandableListHeader
                    desktopClassName={orderDesktopCols}
                    columns={
                      <>
                        <span>Order</span>
                        <span>Item · parties</span>
                        <span>Price / pay</span>
                        <span>Status</span>
                        <span>Delivery</span>
                        <span>Flags</span>
                      </>
                    }
                  />
                  {listWindow.visible.map((o) => {
                    const active = o.id === selectedId;
                    const statusLabel =
                      o.paymentStatus === 'Uncertain' && o.status === 'Paid' ? 'Not yet Paid' : o.status;
                    return (
                      <ExpandableListRow
                        key={o.id}
                        selected={active}
                        onSelect={() => setSelectedId(o.id)}
                        desktopClassName={orderDesktopCols}
                        primary={
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] font-semibold text-plum">{o.id}</span>
                              <StatusBadge tone={statusTone(o.status)}>{statusLabel}</StatusBadge>
                            </div>
                            <div className="mt-1 truncate text-[12.5px] font-semibold text-espresso">
                              {o.listing}
                            </div>
                            <div className="mt-0.5 truncate text-[11.5px] text-body">
                              @{o.buyer} → @{o.seller}
                            </div>
                          </div>
                        }
                        details={[
                          {
                            label: 'Price / pay',
                            value: (
                              <span className="inline-flex flex-col items-end gap-1">
                                <span className="font-semibold tabular-nums">
                                  {showAmounts || isSupport ? formatNaira(o.itemPrice) : '—'}
                                </span>
                                <StatusBadge tone={paymentTone(o.paymentStatus)}>
                                  {o.paymentStatus === 'Uncertain' ? 'Uncertain' : 'Confirmed'}
                                </StatusBadge>
                              </span>
                            ),
                          },
                          { label: 'Delivery', value: o.delivery },
                          {
                            label: 'Flags',
                            value:
                              o.flags.length === 0 ? (
                                '—'
                              ) : (
                                <span className="inline-flex flex-wrap justify-end gap-1.5">
                                  {o.flags.map((f) => (
                                    <StatusBadge key={f} tone={FLAG_META[f].tone}>
                                      {FLAG_META[f].label}
                                    </StatusBadge>
                                  ))}
                                </span>
                              ),
                          },
                        ]}
                      >
                        <span className="font-mono text-[11px] font-semibold text-plum">{o.id}</span>
                        <div className="min-w-0">
                          <div className="truncate text-[12.5px] font-semibold text-espresso">{o.listing}</div>
                          <div className="mt-1 truncate text-[11.5px] text-body">
                            @{o.buyer} → @{o.seller}
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-2">
                          <span className="text-[12px] font-semibold tabular-nums text-espresso">
                            {showAmounts || isSupport ? formatNaira(o.itemPrice) : '—'}
                          </span>
                          <StatusBadge tone={paymentTone(o.paymentStatus)}>
                            {o.paymentStatus === 'Uncertain' ? 'Uncertain' : 'Confirmed'}
                          </StatusBadge>
                        </div>
                        <div>
                          <StatusBadge tone={statusTone(o.status)}>{statusLabel}</StatusBadge>
                        </div>
                        <span className="text-[11.5px] leading-snug text-body">{o.delivery}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {o.flags.length === 0 ? (
                            <span className="text-[11px] text-body">—</span>
                          ) : (
                            o.flags.map((f) => (
                              <StatusBadge key={f} tone={FLAG_META[f].tone}>
                                {FLAG_META[f].label}
                              </StatusBadge>
                            ))
                          )}
                        </div>
                      </ExpandableListRow>
                    );
                  })}
                  <ListWindowFooter {...listWindow} />
                  <p className="border-t border-[#e7dcd2] px-4 py-3 text-[11px] leading-relaxed text-body">
                    Order status is driven by payment, dispatch, delivery and dispute workflows — not by admin
                    override. Payment, refund and payout states live in their own finance modules.
                  </p>
                </>
              ) : null}
            </div>
          </>
        }
        inspector={
          !selected ? (
            <div className="flex flex-1 items-center justify-center px-6 text-[12.5px] text-body">
              Select an order to inspect.
            </div>
          ) : (
            <>
              <div className="border-b border-[#e7dcd2] px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CopyableId value={selected.id} variant="display" />
                    <div className="mt-2 text-[13px] font-semibold text-espresso">{selected.listing}</div>
                    <div className="mt-1 text-[12px] text-body">
                      @{selected.buyer} → @{selected.seller} · placed {selected.placedAt.replace(' · ', ' ')}
                    </div>
                  </div>
                  <StatusBadge tone={statusTone(selected.status)}>{selected.status}</StatusBadge>
                </div>
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
                    <AlertTitle className="text-[12px] text-[#8a5a15]">
                      Order updated while you were reviewing
                    </AlertTitle>
                    <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                      {selected.recordStale.action}. Reload before advising.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.aiSummary ? (
                  <AiAdvisory
                    kind="SUMMARY"
                    recommendation={
                      selected.aiNextStep ? <>Recommended next step: {selected.aiNextStep}.</> : undefined
                    }
                  >
                    {selected.aiSummary}
                  </AiAdvisory>
                ) : null}

                <div className="overflow-hidden rounded-[8px] border border-[#ebe3da]">
                  <div className="flex gap-3 p-3">
                    <div className="size-14 shrink-0 rounded-[4px] bg-[#d9d3cd]" />
                    <div className="min-w-0">
                      <div className="font-semibold text-espresso">{selected.listing}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-body">{selected.listingId}</div>
                      <div className="mt-1 text-[11.5px] text-body">
                        {selected.department} · {selected.category} · {selected.condition}
                      </div>
                      <div className="mt-1 text-[11.5px] text-body">Seller @{selected.seller}</div>
                    </div>
                  </div>
                </div>

                {isFinance ? (
                  <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                        Finance spine
                      </div>
                      <StatusBadge tone="plum">Finance</StatusBadge>
                    </div>
                    <div className="space-y-2 text-[12.5px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-body">Order</span>
                        <span className="font-semibold text-espresso">
                          {selected.id} · {selected.status}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-body">Payment</span>
                        <span className="font-semibold text-espresso">
                          {selected.paymentId} · {selected.paymentStatus.toLowerCase()}
                        </span>
                      </div>
                      {selected.payoutId ? (
                        <div className="flex justify-between gap-2">
                          <span className="text-body">Payout</span>
                          <span className="font-semibold text-espresso">{selected.payoutId} · On Hold</span>
                        </div>
                      ) : null}
                      {selected.refundId ? (
                        <div className="flex justify-between gap-2">
                          <span className="text-body">Refund</span>
                          <span className="font-semibold text-espresso">{selected.refundId}</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between gap-2">
                        <span className="text-body">Delivery address</span>
                        <span className="font-semibold text-body">Not shown</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-body">Private messages</span>
                        <span className="font-semibold text-body">Not shown</span>
                      </div>
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                      Finance sees the financial spine. Address and private messages stay hidden unless a specific
                      financial case requires them.
                    </p>
                  </div>
                ) : null}

                {isTsOrSuper && selected.disputeId ? (
                  <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                        Case context
                      </div>
                      <StatusBadge tone="plum">Trust & Safety</StatusBadge>
                    </div>
                    <div className="space-y-2 text-[12.5px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-body">Case</span>
                        <span className="font-semibold text-espresso">{selected.disputeId} · under review</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-body">Payment</span>
                        <span className="font-semibold text-espresso">
                          Confirmed{isTs ? ' · amounts not required' : ''}
                        </span>
                      </div>
                      {selected.payoutId ? (
                        <div className="flex justify-between gap-2">
                          <span className="text-body">Payout</span>
                          <span className="font-semibold text-espresso">On Hold · status only</span>
                        </div>
                      ) : null}
                      <div className="flex justify-between gap-2">
                        <span className="text-body">Delivery context</span>
                        <span className="font-semibold text-espresso">Visible for this case</span>
                      </div>
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                      Trust & Safety sees case-relevant details. Refund execution, payment changes and payouts stay
                      in finance modules.
                    </p>
                  </div>
                ) : null}

                {!isFinance ? (
                  <div>
                    <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Buyer total
                    </div>
                    <div className="overflow-hidden rounded-[8px] border border-[#ebe3da] text-[12.5px]">
                      <div className="flex justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5">
                        <span className="text-body">Item price</span>
                        <span className="font-semibold tabular-nums text-espresso">
                          {showAmounts ? formatNaira(selected.itemPrice) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5">
                        <span className="text-body">Buyer Protection · 5% of item, capped</span>
                        <span className="font-semibold tabular-nums text-espresso">
                          {showAmounts ? formatNaira(selected.buyerProtection) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5">
                        <span className="text-body">Delivery · {selected.deliveryMethod}</span>
                        <span className="font-semibold tabular-nums text-espresso">
                          {showAmounts ? formatNaira(selected.deliveryFee) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3 bg-[#fbf7f2] px-3 py-2.5">
                        <span className="font-semibold text-espresso">Buyer paid</span>
                        <span className="text-[16px] font-semibold tabular-nums text-espresso">
                          {showAmounts ? formatNaira(selected.total) : '—'}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[11px] text-body">
                      Buyer Protection is calculated on the item price only, not delivery.
                    </p>
                  </div>
                ) : null}

                {selected.flags.includes('cancellable') && selected.cancellableBy ? (
                  <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3">
                    <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Cancellation window
                    </div>
                    <div className="space-y-2 text-[12.5px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-body">Order status</span>
                        <span className="font-semibold text-espresso">{selected.status}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-body">Cancellable by</span>
                        <span className="font-semibold text-espresso">{selected.cancellableBy}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-body">Admin cancel control</span>
                        <span className="font-semibold text-espresso">None</span>
                      </div>
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                      Cancellation is a buyer or seller action while Paid or Awaiting dispatch. Admins can see
                      status but cannot trigger or bypass it.
                    </p>
                  </div>
                ) : null}

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Order timeline
                  </div>
                  <ul className="divide-y divide-[#ebe3da] rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3">
                    {selected.timeline.map((event) => (
                      <li
                        key={event.id}
                        className="grid grid-cols-[108px_minmax(0,1fr)] gap-2 py-2.5 text-[12.5px] first:pt-2.5 last:pb-2.5"
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

                {selected.completionPaused ? (
                  <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                    <AlertTitle className="text-[12px] text-[#8a5a15]">Completion paused</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                      Buyer receipt not confirmed. The 48-hour window from Delivered is paused while{' '}
                      {selected.disputeId ?? 'the dispute'} is open
                      {selected.payoutId ? (
                        <>
                          , and seller payout {selected.payoutId} is On Hold
                        </>
                      ) : null}
                      .
                    </AlertDescription>
                  </Alert>
                ) : null}

                {payoutEligible ? (
                  <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                    <AlertTitle className="text-[12px] text-clear">Completed · payout eligible</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-clear">
                      Buyer confirmed receipt 26 Aug 07:40, ahead of the 48-hour window.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {refundPending && !refundCompleted ? (
                  <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                    <AlertTitle className="text-[12px] text-[#8a5a15]">
                      Refund {selected.refundId} awaiting Finance
                    </AlertTitle>
                    <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                      Origin: pre-dispatch cancellation. Execution happens in Refunds.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {refundCompleted ? (
                  <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                    <AlertTitle className="text-[12px] text-clear">
                      Refund {selected.refundId} completed
                    </AlertTitle>
                    <AlertDescription className="text-[11.5px] text-clear">
                      Executed by Finance · order history retained.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.paymentStatus === 'Uncertain' ? (
                  <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                    <AlertTitle className="text-[12px] text-[#8a5a15]">Order is not Paid</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                      Payment {selected.paymentId} is being verified. The order does not advance and the buyer is
                      asked not to pay again.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {isSupport ? (
                  <Alert className="rounded-[5px] border-dashed border-[#d4c8bc] bg-transparent">
                    <Lock className="size-3.5 text-body" />
                    <AlertTitle className="text-[11px] font-semibold text-espresso">Permission-limited</AlertTitle>
                    <AlertDescription className="text-[11px] text-body">
                      Payment and payout references are visible to Finance and Super Admin. Support sees status
                      words only.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Linked records
                  </div>
                  <div className="overflow-hidden rounded-[8px] border border-[#ebe3da]">
                    {selected.linkedRecords
                      .filter((r) => r.kind !== 'listing' || isTsOrSuper)
                      .map((r) => {
                        const canOpenFinance = showFinanceIds || showTsFinanceStatus;
                        const action = linkedActionLabel(r.kind, r.financeOnly, showFinanceIds);
                        const isFinanceOnlyLabel = action === 'Finance only';
                        const canNavigate =
                          r.kind === 'dispute' ||
                          r.kind === 'listing' ||
                          (r.financeOnly ? showFinanceIds : canOpenFinance);

                        return (
                          <div
                            key={`${r.kind}-${r.id}`}
                            className="flex items-center justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5 last:border-0"
                          >
                            <div className="min-w-0">
                              <div className="font-mono text-[11px] font-semibold text-espresso">
                                {r.financeOnly && isSupport ? r.kind : r.id}
                                {r.financeOnly && isSupport ? '' : ` · ${r.label}`}
                              </div>
                              {r.financeOnly && isSupport ? (
                                <div className="text-[11px] capitalize text-body">{r.label}</div>
                              ) : null}
                            </div>
                            {canNavigate && !isFinanceOnlyLabel ? (
                              <Link
                                to={linkedPath(r.kind)}
                                className="shrink-0 text-[11px] font-semibold text-plum hover:underline"
                              >
                                {action}
                              </Link>
                            ) : (
                              <span className="shrink-0 text-[11px] font-semibold text-body">{action}</span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {showDeliveryContext ? (
                  <div>
                    <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Delivery
                    </div>
                    <div className="overflow-hidden rounded-[8px] border border-[#ebe3da] text-[12.5px]">
                      <div className="flex justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5">
                        <span className="text-body">Method</span>
                        <span className="font-semibold text-espresso">{selected.deliveryMethod}</span>
                      </div>
                      {showDeliveryArea && selected.deliveryArea ? (
                        <div className="flex justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5">
                          <span className="text-body">Recipient area</span>
                          <span className="font-semibold text-espresso">{selected.deliveryArea}</span>
                        </div>
                      ) : null}
                      <div className="flex items-start justify-between gap-3 px-3 py-2.5">
                        <span className="text-body">Full delivery address</span>
                        <span className="inline-flex max-w-[58%] items-start gap-1.5 text-right text-[11.5px] font-semibold text-plum">
                          <Lock className="mt-0.5 size-3.5 shrink-0" />
                          Restricted · available only where authorised and operationally necessary
                        </span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-body">
                      Least privilege: support sees area where needed. Full address stays Restricted and access is
                      audited.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-[#e7dcd2] bg-[#fbf7f2] px-5 py-4">
                <div className="mb-2.5 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                  Order actions · {session ? ROLE_LABELS[session.role] : 'Staff'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={actionBusy}
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
                    disabled={actionBusy}
                    onClick={() => setConfirm('escalate')}
                  >
                    Escalate
                  </Button>
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                  There is no status change, cancel, refund or payout control on this screen for any role. Order
                  state follows the transaction workflow; money moves only in Payments, Refunds and Payouts.
                </p>
              </div>
            </>
          )
        }
      />

      {confirm === 'note' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title="Add internal note"
          description={`Note stays on ${selected.id}. Buyers and sellers never see this.`}
          confirmLabel={actionBusy ? 'Saving…' : 'Save note'}
          reasonLabel="Internal note"
          reasonPlaceholder="Context for the next reviewer…"
          defaultReason={noteDraft}
          onConfirm={(reason) => {
            void runNote(reason);
          }}
        />
      ) : null}

      {confirm === 'escalate' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title="Escalate order"
          description={`Raise ${selected.id} for elevated review. This does not change order status or money.`}
          confirmLabel={actionBusy ? 'Escalating…' : 'Escalate'}
          reasonLabel="Escalation reason"
          reasonPlaceholder="Why this needs elevated review…"
          onConfirm={(reason) => {
            void runEscalate(reason);
          }}
        />
      ) : null}
    </>
  );
}
