import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  executeAdminPayout,
  fetchAdminPayout,
  fetchAdminPayouts,
  holdAdminPayout,
  noteAdminPayout,
  releaseAdminPayout,
  retryAdminPayout,
  verifyAdminPayout,
  type AdminPayoutDto,
} from '@/api/payouts';
import { useAuth } from '@/auth/AuthContext';
import { useBleedSelection } from '@/hooks/use-bleed-selection';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState, ErrorState } from '@/components/admin/empty-state';
import { ListSkeleton } from '@/components/admin/loading-skeleton';
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
import { canAct, ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { Check, Lock, X } from 'lucide-react';
import { formatNaira } from '@/lib/format';

type QueueFilter =
  | 'eligible'
  | 'on_hold'
  | 'verification'
  | 'processing'
  | 'failed'
  | 'paid'
  | 'not_eligible';
type ConfirmKind = 'process' | 'hold' | 'release' | 'note' | 'maintain' | 'retry' | null;

type PayoutOverride = {
  status?: AdminPayoutDto['status'];
  headerStatus?: string;
  history?: AdminPayoutDto['history'];
  flash?: string | null;
  holdReason?: string;
  processingAt?: string;
  processingBy?: string;
  paidAt?: string;
  paidBy?: string;
};

function statusTone(s: AdminPayoutDto['status']): StatusTone {
  if (s === 'Eligible') return 'plum';
  if (s === 'On Hold' || s === 'Verification required') return 'hold';
  if (s === 'Processing') return 'neutral';
  if (s === 'Paid out') return 'clear';
  if (s === 'Failed') return 'risk';
  return 'neutral';
}

function verificationTone(v: AdminPayoutDto['verification']): StatusTone {
  if (v === 'Approved') return 'clear';
  if (v === 'Pending') return 'hold';
  return 'neutral';
}

export function PayoutsPage() {
  const { session } = useAuth();
  const liveMode = Boolean(session?.accessToken);
  const { banner, show } = useToast();
  const [queue, setQueue] = useState<QueueFilter>('eligible');
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [overrides, setOverrides] = useState<Record<string, PayoutOverride>>({});
  const [noteDraft, setNoteDraft] = useState('');
  const [actionInvalid, setActionInvalid] = useState<string | null>(null);
  const [livePayouts, setLivePayouts] = useState<AdminPayoutDto[]>([]);
  const [liveCounts, setLiveCounts] = useState({
    eligible: 0,
    on_hold: 0,
    verification: 0,
    processing: 0,
    failed: 0,
    paid: 0,
    not_eligible: 0,
  });
  const [loading, setLoading] = useState(liveMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const canExecute = session ? canAct(session.role, 'execute_payout') : false;
  const canHold = session ? canAct(session.role, 'hold_payout') : false;
  const isTs = session?.role === 'trust_safety';
  const isSupport = session?.role === 'support';
  const showAmounts = !isTs && !isSupport;

  const loadLive = useCallback(async () => {
    if (!liveMode) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAdminPayouts(queue, search);
      setLivePayouts(data.payouts);
      setLiveCounts(data.counts);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load payouts');
    } finally {
      setLoading(false);
    }
  }, [liveMode, queue, search]);

  const applyDetail = useCallback((detail: { payout: AdminPayoutDto }) => {
    setLivePayouts((current) => {
      const idx = current.findIndex((p) => p.id === detail.payout.id);
      if (idx === -1) return [detail.payout, ...current];
      const next = [...current];
      next[idx] = detail.payout;
      return next;
    });
    setOverrides((current) => {
      const next = { ...current };
      delete next[detail.payout.id];
      return next;
    });
  }, []);

  const loadSelectedDetail = useCallback(
    async (id: string) => {
      if (!liveMode) return;
      try {
        const detail = await fetchAdminPayout(id);
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
      setLivePayouts([]);
      return;
    }
    void loadLive();
  }, [liveMode, loadLive]);

  const payouts = useMemo(
    () =>
      livePayouts.map((p) => {
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
    [livePayouts, overrides],
  );

  const eligibleCount = liveCounts.eligible;
  const holdCount = liveCounts.on_hold;
  const verifyCount = liveCounts.verification;
  const processingCount = liveCounts.processing;
  const failedCount = liveCounts.failed;
  const eligibleTotal = payouts
    .filter((p) => p.status === 'Eligible')
    .reduce((sum, p) => sum + p.net, 0);

  usePageChrome({
    title: 'Payouts',
    subtitle: `${eligibleCount} eligible · ${holdCount} On Hold · ledger execute (no live PSP yet)`,
    search,
    onSearchChange: setSearch,
    searchPlaceholder: 'Payout, order or seller',
    bleed: true,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payouts;
    return payouts.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.seller.toLowerCase().includes(q) ||
        p.orderId.toLowerCase().includes(q),
    );
  }, [payouts, search]);

  const [selectedId, setSelectedId] = useBleedSelection(null);

  useEffect(() => {
    if (!selectedId) return;
    if (!payouts.some((p) => p.id === selectedId)) setSelectedId(null);
  }, [payouts, selectedId, setSelectedId]);

  useEffect(() => {
    if (!liveMode || !selectedId) return;
    void loadSelectedDetail(selectedId);
  }, [liveMode, selectedId, loadSelectedDetail]);

  const listWindow = useListWindow(rows);

  const selected = payouts.find((p) => p.id === selectedId) ?? null;
  const selectedFlash = selected ? overrides[selected.id]?.flash : null;

  function tryProcess(payout: AdminPayoutDto) {
    if (payout.status === 'On Hold' || payout.disputeId) {
      setActionInvalid(
        'A dispute was opened on this order. The payout returned to On Hold. Your process request was not executed.',
      );
      show('Action no longer valid');
      return;
    }
    setConfirm('process');
  }

  async function processSelected(reason: string, isRetry = false) {
    if (!selected || !liveMode) return;
    setActionBusy(true);
    try {
      const detail = isRetry
        ? await retryAdminPayout(selected.id, reason)
        : await executeAdminPayout(selected.id, reason);
      applyDetail(detail);
      show(`Processed ${selected.id}`);
      setConfirm(null);
      await loadLive();
      await loadSelectedDetail(selected.id);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Process failed');
      setConfirm(null);
    } finally {
      setActionBusy(false);
    }
  }

  async function holdSelected(reason: string) {
    if (!selected || !liveMode) return;
    setActionBusy(true);
    try {
      const detail = await holdAdminPayout(selected.id, reason);
      applyDetail(detail);
      show(`Hold placed · ${selected.id}`);
      setConfirm(null);
      await loadLive();
      await loadSelectedDetail(selected.id);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Hold failed');
    } finally {
      setActionBusy(false);
    }
  }

  async function releaseSelected(reason: string) {
    if (!selected || !liveMode) return;
    setActionBusy(true);
    try {
      const detail = await releaseAdminPayout(selected.id, reason);
      applyDetail(detail);
      show(`Hold released · ${selected.id}`);
      setConfirm(null);
      await loadLive();
      await loadSelectedDetail(selected.id);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Release failed');
      setConfirm(null);
    } finally {
      setActionBusy(false);
    }
  }

  async function verifySelected() {
    if (!selected || !liveMode) return;
    setActionBusy(true);
    try {
      const detail = await verifyAdminPayout(selected.id);
      applyDetail(detail);
      show(`Provider status checked · ${selected.id}`);
      await loadLive();
      await loadSelectedDetail(selected.id);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Status check failed');
    } finally {
      setActionBusy(false);
    }
  }

  async function noteSelected(reason: string) {
    if (!selected || !liveMode) return;
    setActionBusy(true);
    try {
      const detail = await noteAdminPayout(selected.id, reason);
      applyDetail(detail);
      show('Internal note saved');
      setConfirm(null);
      await loadSelectedDetail(selected.id);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Note failed');
    } finally {
      setActionBusy(false);
    }
  }

  const payoutDesktopCols =
    'grid-cols-[88px_minmax(0,1.2fr)_72px_72px_64px_72px_88px_120px] items-center gap-x-2 py-3.5';

  return (
    <>
      <BleedSplit
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        gridClassName="grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.95fr)]"
        inspectorTitle="Payout"
        list={
          <>
            <div className="space-y-3 border-b border-[#e7dcd2] px-4 py-4">
              {liveMode ? (
                <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                  Live queue · staff API
                </div>
              ) : null}
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
            </div>

            <div ref={listWindow.scrollRef} className="min-h-0 flex-1 overflow-auto">
              {loading ? <ListSkeleton rows={6} /> : null}
              {!loading && loadError && liveMode ? (
                <ErrorState
                  title="Could not load payouts"
                  description={loadError}
                  onRetry={() => void loadLive()}
                />
              ) : null}
              {!loading && !(loadError && liveMode) && rows.length === 0 ? (
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
                  }}
                />
              ) : null}

              {!loading && !(loadError && liveMode) && rows.length > 0 ? (
                <>
                  <ExpandableListHeader
                    desktopClassName={payoutDesktopCols}
                    columns={
                      <>
                        <span>Payout</span>
                        <span>Seller & order</span>
                        <span>Sale</span>
                        <span>Commission</span>
                        <span>Fee</span>
                        <span>Net</span>
                        <span>Verification</span>
                        <span>Status</span>
                      </>
                    }
                  />
                  {listWindow.visible.map((p) => {
                    const active = p.id === selectedId;
                    return (
                      <ExpandableListRow
                        key={p.id}
                        selected={active}
                        onSelect={() => {
                          setSelectedId(p.id);
                          setActionInvalid(null);
                        }}
                        desktopClassName={payoutDesktopCols}
                        primary={
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] font-semibold text-plum">{p.id}</span>
                              <StatusBadge tone={statusTone(p.status)}>{p.status}</StatusBadge>
                            </div>
                            <div className="mt-1 truncate text-[12.5px] font-semibold text-espresso">
                              @{p.seller}
                            </div>
                            <div className="mt-0.5 font-mono text-[11px] text-body">{p.orderId}</div>
                          </div>
                        }
                        details={[
                          {
                            label: 'Sale',
                            value: showAmounts ? formatNaira(p.saleTotal) : '—',
                          },
                          {
                            label: 'Commission',
                            value: showAmounts ? formatNaira(p.commission) : '—',
                          },
                          {
                            label: 'Fee',
                            value: showAmounts ? formatNaira(p.fees) : '—',
                          },
                          {
                            label: 'Net',
                            value: (
                              <span className="font-semibold">
                                {showAmounts ? formatNaira(p.net) : '—'}
                              </span>
                            ),
                          },
                          {
                            label: 'Verification',
                            value: (
                              <StatusBadge tone={verificationTone(p.verification)}>
                                {p.verification}
                              </StatusBadge>
                            ),
                          },
                        ]}
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
                      </ExpandableListRow>
                    );
                  })}
                  <ListWindowFooter {...listWindow} />
                </>
              ) : null}
            </div>
          </>
        }
        inspector={
          !selected ? (
            <div className="flex flex-1 items-center justify-center px-6 text-[12.5px] text-body">
              Select a payout to inspect.
            </div>
          ) : (
            <>
              <div className="border-b border-[#e7dcd2] px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CopyableId value={selected.id} variant="display" />
                    <div className="mt-2 text-[12.5px] text-body">
                      @{selected.seller} · {selected.orderId} · {selected.createdAt}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
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
                    {canExecute && liveMode ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        disabled={actionBusy}
                        onClick={() => void verifySelected()}
                      >
                        Check provider status
                      </Button>
                    ) : null}
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
                      onClick={() => setConfirm('maintain')}
                    >
                      Maintain hold
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
                        disabled={actionBusy}
                        onClick={() => tryProcess(selected)}
                      >
                        Process payout — review & confirm
                      </Button>
                    ) : null}

                    {canHold && selected.status === 'On Hold' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={actionBusy}
                        onClick={() => {
                          setConfirm('release');
                        }}
                      >
                        {liveMode
                          ? 'Release hold — review & confirm'
                          : 'Release hold — unavailable until case closes'}
                      </Button>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {canHold && selected.status === 'Eligible' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={actionBusy}
                          onClick={() => setConfirm('hold')}
                        >
                          Place hold
                        </Button>
                      ) : null}
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
                    </div>
                  </div>
                )}

                <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                  Amounts are calculated by Throve and cannot be edited here. Simulated payouts do not move real
                  money.
                </p>
              </div>
            </>
          )
        }
      />

      {confirm === 'process' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title={`Process payout ${selected.id}`}
          description="Confirm the seller net amount and the eligibility checks before executing. The amount is calculated by Throve and cannot be edited here."
          confirmLabel={actionBusy ? 'Processing…' : 'Process payout'}
          requireCheckbox
          checkboxLabel="I have reviewed the eligibility checks for this payout."
          reasonLabel="Context / reason recorded"
          reasonPlaceholder="Approved payout execution — all eligibility checks satisfied."
          defaultReason="Approved payout execution — all eligibility checks satisfied."
          metaRows={[
            { label: 'Seller', value: `@${selected.seller} · verification approved` },
            { label: 'Order', value: `${selected.orderId} · Completed` },
            { label: 'Net payout', value: formatNaira(selected.net) },
            { label: 'Destination', value: selected.destinationMasked ?? 'Not on file' },
            {
              label: 'Environment',
              value: liveMode
                ? 'Ledger execute — simulate auto-completes; no live PSP transfer yet'
                : 'Test — simulated payout, no real money',
            },
            { label: 'Audit entry', value: 'Created on confirm' },
          ]}
          onConfirm={(reason) => {
            void processSelected(reason, false);
          }}
        />
      ) : null}

      {confirm === 'hold' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title={`Place hold on ${selected.id}`}
          description="Hold stops payout execution until Trust & Safety or Finance clears the case."
          confirmLabel={actionBusy ? 'Holding…' : 'Place hold'}
          reasonLabel="Internal hold reason"
          reasonPlaceholder="Why this payout must wait…"
          onConfirm={(reason) => {
            void holdSelected(reason);
          }}
        />
      ) : null}

      {confirm === 'release' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title={`Release hold on ${selected.id}`}
          description="Returns the payout to Eligible or Verification required. Blocked while a dispute is still open."
          confirmLabel={actionBusy ? 'Releasing…' : 'Release hold'}
          reasonLabel="Release reason"
          reasonPlaceholder="Why this hold can be cleared…"
          onConfirm={(reason) => {
            void releaseSelected(reason);
          }}
        />
      ) : null}

      {(confirm === 'note' || confirm === 'maintain') && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title={confirm === 'maintain' ? 'Maintain hold' : 'Add internal note'}
          description={
            confirm === 'maintain'
              ? `Keep hold on ${selected.id}. Sellers see only the safe hold wording.`
              : `Note stays on ${selected.id}. Sellers never see this.`
          }
          confirmLabel={
            actionBusy ? 'Saving…' : confirm === 'maintain' ? 'Maintain hold' : 'Save note'
          }
          reasonLabel={confirm === 'maintain' ? 'Case note' : 'Internal note'}
          reasonPlaceholder="Context for the next reviewer…"
          defaultReason={noteDraft}
          onConfirm={(reason) => {
            void noteSelected(reason);
          }}
        />
      ) : null}
    </>
  );
}
