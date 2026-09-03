import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { AiAdvisory } from '@/components/admin/ai-advisory';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { FilterChips } from '@/components/admin/filter-chips';
import { StatusBadge } from '@/components/admin/status-badge';
import { usePageChrome } from '@/components/layout/shell-chrome';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatNaira, mockDisputes, type MockDispute } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { canAct, ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';

type Decision = 'Refund buyer' | 'Release to seller' | 'Close';

type RecordedDecision = {
  outcome: Decision;
  reason: string;
  by: string;
  at: string;
};

const DECISIONS: { id: Decision; label: string }[] = [
  { id: 'Refund buyer', label: 'Refund buyer' },
  { id: 'Release to seller', label: 'Release / continue seller payout' },
  { id: 'Close', label: 'Close with no financial change' },
];

const PROTECTION_COVERED = [
  'Item never arrives',
  'Materially different from listing',
  'Wrong item',
  'Counterfeit',
];

const PROTECTION_NOT_COVERED = [
  'Change of mind',
  'Fit / preference',
  'Damage after delivery',
  'Off-platform transactions',
  'Claims after the 48-hour window',
];

function queueCounts() {
  return {
    open: mockDisputes.filter((d) => d.status === 'Open' || d.status === 'With T&S').length,
    decision_ready: mockDisputes.filter((d) => d.decisionReady).length,
    evidence_incomplete: mockDisputes.filter((d) => d.queue === 'evidence_incomplete').length,
    awaiting_buyer: mockDisputes.filter((d) => d.queue === 'awaiting_buyer').length,
  };
}

function outcomeHeadline(outcome: Decision | NonNullable<MockDispute['decision']>) {
  if (outcome === 'Refund buyer') return 'Buyer wins — refund approved';
  if (outcome === 'Release to seller') return 'Seller wins — release / continue payout';
  if (outcome === 'Close') return 'Closed with no financial change';
  return outcome;
}

export function DisputesPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(mockDisputes[0]?.id ?? null);
  const [outcome, setOutcome] = useState<Decision>('Refund buyer');
  const [reason, setReason] = useState(mockDisputes[0]?.defaultReason ?? '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recorded, setRecorded] = useState<Record<string, RecordedDecision>>({});
  const [dismissedStale, setDismissedStale] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState(false);

  usePageChrome({
    title: 'Disputes',
    subtitle: 'Buyer Protection cases · 23 open · 6 urgent · decision authority: Trust & Safety',
    search,
    onSearchChange: setSearch,
    searchPlaceholder: 'Case, order or username…',
    bleed: true,
  });

  const canDecide = session ? canAct(session.role, 'decide_dispute') : false;
  const isFinance = session?.role === 'finance';
  const isSupport = session?.role === 'support';
  const isTsOrSuper = session?.role === 'trust_safety' || session?.role === 'super_admin';
  const counts = queueCounts();

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockDisputes.filter((d) => {
      if (filter === 'open' && !(d.status === 'Open' || d.status === 'With T&S')) return false;
      if (filter === 'decision_ready' && !d.decisionReady) return false;
      if (filter === 'evidence_incomplete' && d.queue !== 'evidence_incomplete') return false;
      if (filter === 'awaiting_buyer' && d.queue !== 'awaiting_buyer') return false;
      if (!q) return true;
      return (
        d.id.toLowerCase().includes(q) ||
        d.orderId.toLowerCase().includes(q) ||
        d.buyer.toLowerCase().includes(q) ||
        d.seller.toLowerCase().includes(q) ||
        d.reason.toLowerCase().includes(q)
      );
    });
  }, [filter, search]);

  const selected = mockDisputes.find((d) => d.id === selectedId) ?? null;
  const recordedForSelected = selected ? recorded[selected.id] : undefined;
  const isDecided =
    Boolean(recordedForSelected) ||
    selected?.status === 'Approved for refund' ||
    selected?.status === 'Denied' ||
    selected?.status === 'Closed' ||
    Boolean(selected?.decision);

  const decidedOutcome = recordedForSelected?.outcome ?? selected?.decision;
  const decidedBy =
    recordedForSelected?.by ?? selected?.decidedBy ?? (session ? `${session.name} · ${ROLE_LABELS[session.role]}` : 'Staff');
  const decisionBlocked =
    Boolean(selected?.evidenceBlockReason) || selected?.queue === 'awaiting_buyer' || Boolean(selected?.unassigned);

  function selectCase(d: MockDispute) {
    setSelectedId(d.id);
    setOutcome('Refund buyer');
    setReason(d.defaultReason ?? '');
    setSaveError(false);
  }

  const decidingRole = session ? ROLE_LABELS[session.role] : 'Staff';

  return (
    <>
      <div className="grid h-full min-h-0 grid-cols-2">
        <div className="flex min-h-0 min-w-0 flex-col border-r border-[#dccfc4] bg-panel">
          <div className="space-y-3 border-b border-[#e7dcd2] px-4 py-4">
            <FilterChips
              tone="soft"
              value={filter}
              onChange={setFilter}
              options={[
                { id: 'open', label: 'Open', count: counts.open },
                { id: 'decision_ready', label: 'Decision ready', count: counts.decision_ready },
                { id: 'evidence_incomplete', label: 'Evidence incomplete', count: counts.evidence_incomplete },
                { id: 'awaiting_buyer', label: 'Awaiting buyer', count: counts.awaiting_buyer },
              ]}
            />
            {banner}
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
            {rows.length === 0 ? (
              <EmptyState
                title="No cases found"
                description={search ? `Nothing matches “${search}”.` : 'No disputes in this queue.'}
                actionLabel="Clear filters"
                onAction={() => {
                  setFilter('open');
                  setSearch('');
                }}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {rows.map((d) => {
                  const active = d.id === selectedId;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => selectCase(d)}
                      className={cn(
                        'rounded-[6px] border px-3 py-3 text-left transition',
                        active ? 'border-plum bg-[#f7eef3]' : 'border-[#e7dcd2] bg-panel hover:bg-[#fbf5ef]',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-semibold text-espresso">{d.id}</span>
                        <span className="text-[10.5px] tabular-nums text-[#8c7a73]">{d.openLabel}</span>
                      </div>
                      <div className="mt-1 text-[12px] text-espresso">
                        {d.reason} · {d.orderId}
                      </div>
                      <div className="mt-1 text-[11px] text-muted">
                        @{d.buyer} (buyer) → @{d.seller} (seller) · {formatNaira(d.amount)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {d.unassigned ? <StatusBadge tone="neutral">Unassigned</StatusBadge> : null}
                        {d.aiPriority === 'High' ? <StatusBadge tone="risk">AI · High</StatusBadge> : null}
                        {d.payoutOnHold ? <StatusBadge tone="hold">Payout On Hold</StatusBadge> : null}
                        {d.evidenceComplete ? (
                          <StatusBadge tone="clear">Evidence complete</StatusBadge>
                        ) : d.queue === 'evidence_incomplete' ? (
                          <StatusBadge tone="hold">Evidence incomplete</StatusBadge>
                        ) : null}
                        {d.decisionReady ? <StatusBadge tone="plum">Decision ready</StatusBadge> : null}
                        {d.queue === 'awaiting_buyer' ? <StatusBadge tone="neutral">Awaiting buyer</StatusBadge> : null}
                        {d.decision === 'Refund buyer' || recorded[d.id]?.outcome === 'Refund buyer' ? (
                          <StatusBadge tone="clear">Refund approved</StatusBadge>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-[#e7dcd2] px-4 py-2.5 text-[10.5px] text-[#8c7a73]">
            Showing {rows.length} of 23 · queue order is AI-assisted, review is human.
          </div>
        </div>

        {selected ? (
          <div className="flex min-h-0 min-w-0 flex-col overflow-auto bg-panel px-5 py-5">
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-[26px] leading-none text-espresso">{selected.id}</h2>
                    {isFinance ? <StatusBadge tone="plum">Finance</StatusBadge> : null}
                    {isSupport ? <StatusBadge tone="plum">Customer Support</StatusBadge> : null}
                    {selected.unassigned ? <StatusBadge tone="neutral">New · unassigned</StatusBadge> : null}
                    {isDecided && decidedOutcome ? (
                      <StatusBadge tone={decidedOutcome === 'Refund buyer' ? 'clear' : 'neutral'}>
                        {outcomeHeadline(decidedOutcome)}
                      </StatusBadge>
                    ) : selected.decisionReady ? (
                      <StatusBadge tone="plum">Decision ready</StatusBadge>
                    ) : (
                      <StatusBadge tone="hold">{isSupport ? 'Under review by Trust & Safety' : selected.status}</StatusBadge>
                    )}
                  </div>
                  <div className="mt-2 text-[12px] text-muted">
                    {selected.reason} · {selected.orderId}
                    {selected.listingId ? ` · ${selected.listingId}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9.5px] font-semibold tracking-[0.12em] text-[#8c7a73] uppercase">Order value</div>
                  <div className="font-display text-[28px] leading-none text-espresso">{formatNaira(selected.amount)}</div>
                </div>
              </div>

              {saveError ? (
                <div className="rounded-[5px] border border-[#e4b4b4] bg-[#fbf0f0] px-3.5 py-2.5">
                  <div className="text-[12px] font-semibold text-[#8a2323]">Error — decision not saved</div>
                  <p className="mt-1 text-[11.5px] text-[#8a2323]">
                    The decision could not be recorded. Check your connection and try again. No audit entry was written.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-8 border-[#e4b4b4] text-[11.5px] text-[#8a2323]"
                    onClick={() => setSaveError(false)}
                  >
                    Dismiss
                  </Button>
                </div>
              ) : null}

              {selected.recordStale && !dismissedStale[selected.id] ? (
                <div className="rounded-[5px] border border-[#e0b87a] bg-[#fbf3e6] px-3.5 py-2.5">
                  <div className="text-[12px] font-semibold text-[#8a5a15]">Record changed by another admin</div>
                  <p className="mt-1 text-[11.5px] text-[#8a5a15]">
                    This case was updated {selected.recordStale.at}. {selected.recordStale.by}{' '}
                    {selected.recordStale.action} while you were reviewing.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-8 border-[#d4a574] text-[11.5px] text-[#8a5a15]"
                    onClick={() => setDismissedStale((prev) => ({ ...prev, [selected.id]: true }))}
                  >
                    Reload record
                  </Button>
                </div>
              ) : null}

              {selected.actionAlreadyApplied && !recordedForSelected ? (
                <div className="rounded-[5px] border border-[#9fbfa8] bg-[#eef6f0] px-3.5 py-2.5">
                  <div className="text-[12px] font-semibold text-[#2f6b45]">
                    {selected.actionAlreadyApplied.action} already completed
                  </div>
                  <p className="mt-1 text-[11.5px] text-[#2f6b45]">
                    Recorded by {selected.actionAlreadyApplied.by} at {selected.actionAlreadyApplied.at}. No further
                    decision action taken.
                  </p>
                </div>
              ) : null}

              {selected.unassigned ? (
                <div className="rounded-[5px] border border-[#e7dcd2] bg-[#fbf5ef] px-3.5 py-2.5 text-[12px] text-body">
                  <span className="font-semibold text-espresso">New — unassigned.</span> Assign a Trust &amp; Safety
                  reviewer before requesting evidence or recording a decision.
                </div>
              ) : null}

              {selected.evidenceBlockReason ? (
                <div className="rounded-[5px] border border-[#e0b87a] bg-[#fbf3e6] px-3.5 py-2.5">
                  <div className="text-[12px] font-semibold text-[#8a5a15]">Evidence incomplete</div>
                  <p className="mt-1 text-[11.5px] text-[#8a5a15]">
                    Decision blocked. {selected.evidenceBlockReason}
                  </p>
                </div>
              ) : null}

              {selected.queue === 'awaiting_buyer' ? (
                <div className="rounded-[5px] border border-[#e0b87a] bg-[#fbf3e6] px-3.5 py-2.5">
                  <div className="text-[12px] font-semibold text-[#8a5a15]">Awaiting buyer information</div>
                  <p className="mt-1 text-[11.5px] text-[#8a5a15]">
                    Requested {selected.awaitingBuyerSince ?? selected.openedAt}. Customer communication required before
                    deciding.
                  </p>
                </div>
              ) : null}

              {selected.payoutOnHold && !isFinance ? (
                <div className="rounded-[5px] border border-[#e0b87a] bg-[#fbf3e6] px-3.5 py-2.5 text-[12px] text-[#8a5a15]">
                  <span className="font-semibold">Seller payout On Hold</span>
                  {selected.paymentId ? ` · ${selected.paymentId}` : null}
                  {' · '}48-hour completion clock paused.
                </div>
              ) : null}

              {/* Finance: outcome-only strip */}
              {isFinance ? (
                <div className="rounded-[6px] border border-[#e7dcd2] bg-[#fbf5ef] p-3.5">
                  <div className="text-[11.5px] font-semibold text-espresso">Finance view</div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                    Decision controls are not available to Finance. Buyer statements, private messages and moderation
                    history are not shown — only the approved outcome and the case and order references needed to execute
                    it.
                  </p>
                  {isDecided && decidedOutcome === 'Refund buyer' ? (
                    <>
                      <div className="mt-3 rounded-[5px] border border-[#9fbfa8] bg-[#eef6f0] px-3 py-2.5">
                        <div className="text-[12px] font-semibold text-[#2f6b45]">Buyer wins — refund approved</div>
                        <div className="mt-1 text-[11px] text-[#2f6b45]">
                          {selected.id} · {selected.orderId} · {formatNaira(selected.amount)} · Financial execution:
                          Awaiting Finance
                        </div>
                      </div>
                      <Button asChild className="mt-3 w-full">
                        <Link to="/refunds">Open in Refunds to execute</Link>
                      </Button>
                    </>
                  ) : isDecided && decidedOutcome === 'Release to seller' ? (
                    <div className="mt-3 rounded-[5px] border border-[#e7dcd2] bg-panel px-3 py-2.5 text-[12px] text-body">
                      Seller wins — release / continue payout. No refund execution required.
                    </div>
                  ) : (
                    <p className="mt-3 text-[11.5px] text-muted">No approved financial outcome yet for this case.</p>
                  )}
                </div>
              ) : null}

              {/* Support: limited context */}
              {isSupport ? (
                <>
                  <div className="rounded-[6px] border border-[#e7dcd2] bg-[#fbf5ef] p-3.5">
                    <div className="text-[11.5px] font-semibold text-espresso">Support context</div>
                    <div className="mt-1.5 text-[12.5px] text-espresso">
                      Status: Under review by Trust &amp; Safety · {selected.orderId} · {formatNaira(selected.amount)}
                    </div>
                    <div className="mt-2 text-[11.5px] text-muted">
                      Evidence: <span className="font-semibold text-espresso">Permitted items only</span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {selected.evidence
                        .filter((e) => !e.restricted)
                        .map((e) => (
                          <li key={e.id} className="text-[11.5px] text-body">
                            · {e.label}
                          </li>
                        ))}
                      {selected.evidence.filter((e) => !e.restricted).length === 0 ? (
                        <li className="text-[11.5px] text-muted">· No permitted evidence items</li>
                      ) : null}
                    </ul>
                    <p className="mt-3 text-[10.5px] leading-relaxed text-[#8c7a73]">
                      No decision or financial controls are shown for this role.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="h-auto border-plum py-2.5 text-[12px] font-semibold text-plum"
                        onClick={() => show(`Internal note drafted on ${selected.id}`)}
                      >
                        Add internal note
                      </Button>
                      <Button
                        variant="outline"
                        className="h-auto border-[#dccfc4] py-2.5 text-[12px] font-semibold text-espresso"
                        onClick={() => show(`Escalated ${selected.id} to Trust & Safety`)}
                      >
                        Escalate
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}

              {/* T&S / Super: full investigation + decision */}
              {isTsOrSuper ? (
                <>
                  {isDecided && decidedOutcome ? (
                    <div className="space-y-2.5">
                      <div className="rounded-[6px] border border-[#9fbfa8] bg-[#eef6f0] px-3.5 py-3">
                        <div className="text-[12.5px] font-semibold text-[#2f6b45]">
                          {outcomeHeadline(decidedOutcome)}
                        </div>
                        <div className="mt-1 text-[11.5px] text-[#2f6b45]">
                          Decided by {decidedBy}
                          {recordedForSelected?.at ? ` · ${recordedForSelected.at}` : selected.decidedAt ? ` · ${selected.decidedAt}` : ''}
                        </div>
                      </div>
                      <div className="rounded-[6px] border border-[#e7dcd2] bg-[#fbf5ef] px-3.5 py-3">
                        <div className="text-[12px] font-semibold text-espresso">Financial execution</div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                          {decidedOutcome === 'Refund buyer'
                            ? 'Awaiting Finance. Seller payout remains On Hold until Finance closes the refund.'
                            : decidedOutcome === 'Release to seller'
                              ? 'Seller payout may continue. No refund instruction for Finance.'
                              : 'No financial change. Seller payout follows normal completion rules.'}
                        </p>
                        <p className="mt-2 text-[10.5px] leading-relaxed text-[#8c7a73]">
                          Trust &amp; Safety decides, Finance moves the money. Neither role performs the other&apos;s step
                          in normal operations.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {!isDecided ? <AiAdvisory kind="CASE SUMMARY">{selected.aiSummary}</AiAdvisory> : null}

                  {!isDecided ? (
                    <div className="rounded-[6px] border border-dashed border-[#d9bfcf] bg-[#f4ecf1] px-4 py-3.5">
                      <div className="mb-1.5 text-[9.5px] font-bold tracking-[0.14em] text-plum uppercase">
                        AI recommendation
                      </div>
                      <div className="text-[12.5px] leading-relaxed text-[#3e2b36]">
                        Suggested outcome: <span className="font-semibold">{selected.suggestedOutcome}</span>
                        {' · '}Confidence: {selected.aiConfidence}.
                      </div>
                      <p className="mt-2 text-[10.5px] leading-relaxed text-[#7a5a6b]">
                        Throve’s AI cannot finalise disputes, refunds or payouts. A Trust &amp; Safety or Super Admin
                        decision is required.
                      </p>
                    </div>
                  ) : null}

                  {canDecide && !isDecided ? (
                    <div className="rounded-[6px] border border-[#e7dcd2] bg-[#fbf5ef] p-3.5">
                      <div className="text-[11.5px] font-semibold text-espresso">Human decision · {decidingRole}</div>
                      {decisionBlocked ? (
                        <p className="mt-2 text-[11.5px] leading-relaxed text-[#8a5a15]">
                          Decision controls are blocked until the case is ready (assigned, evidence complete, and not
                          awaiting buyer).
                        </p>
                      ) : (
                        <>
                          <div className="mt-3 flex flex-col gap-2">
                            {DECISIONS.map((opt) => {
                              const active = outcome === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setOutcome(opt.id)}
                                  className={cn(
                                    'rounded-[5px] border px-3 py-2.5 text-left text-[12px] font-semibold transition',
                                    active
                                      ? 'border-plum bg-[#f7eef3] text-plum'
                                      : 'border-[#e7dcd2] bg-panel text-espresso hover:border-plum/40',
                                  )}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>

                          <div className="mt-3.5 flex flex-col gap-1.5">
                            <Label
                              htmlFor="decision-reason"
                              className="text-[10px] font-semibold tracking-[0.12em] text-[#8c7a73] uppercase"
                            >
                              Decision reason (required)
                            </Label>
                            <Textarea
                              id="decision-reason"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              className="min-h-[88px] bg-card text-[12px]"
                              placeholder="Document the evidence basis for this decision…"
                            />
                          </div>

                          <div className="mt-3 space-y-1 text-[10.5px] leading-relaxed text-[#8c7a73]">
                            <div>
                              Deciding admin:{' '}
                              <span className="font-semibold text-espresso">{session?.name ?? 'Staff'}</span>
                            </div>
                            <div>AI assistance used · audit entry created on confirm</div>
                          </div>

                          <Button
                            className="mt-3.5 h-auto w-full py-3 text-[12.5px] font-semibold"
                            disabled={reason.trim().length < 3}
                            onClick={() => setConfirmOpen(true)}
                          >
                            Record decision — review &amp; confirm
                          </Button>
                          <p className="mt-2 text-[10.5px] leading-relaxed text-[#8c7a73]">
                            Trust &amp; Safety does not execute refunds or payouts. No “issue refund now” control exists
                            on this screen.
                          </p>
                        </>
                      )}
                    </div>
                  ) : null}

                  {!isDecided && selected.statements.length ? (
                    <section>
                      <div className="mb-2 text-[11.5px] font-semibold text-espresso">Statements</div>
                      <div className="flex flex-col gap-2">
                        {selected.statements.map((s) => (
                          <div
                            key={`${s.handle}-${s.at}`}
                            className="rounded-[5px] border border-[#e7dcd2] bg-panel px-3.5 py-3"
                          >
                            <div className="text-[11px] font-semibold text-espresso">
                              {s.party === 'buyer' ? 'Buyer' : 'Seller'} @{s.handle}
                              <span className="ml-2 font-normal text-muted">{s.at}</span>
                            </div>
                            <p className="mt-1.5 text-[12.5px] leading-relaxed text-body">{s.text}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {!isDecided ? (
                    <section>
                      <div className="mb-2 text-[11.5px] font-semibold text-espresso">Evidence held by Throve</div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {selected.evidenceThumbs.map((thumb) => (
                          <div
                            key={thumb.id}
                            className={cn(
                              'flex aspect-[4/3] items-end rounded-[5px] border px-2 py-2 text-[10.5px] leading-snug',
                              thumb.missing
                                ? 'border-[#e0b87a] bg-[#fbf3e6] text-[#8a5a15]'
                                : 'border-[#e7dcd2] bg-[#f3ede6] text-muted',
                            )}
                          >
                            {thumb.missing ? (
                              <span>
                                <span className="font-semibold">No seller file</span>
                                <br />
                                Seller delivery document missing.
                              </span>
                            ) : (
                              thumb.label
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {selected.evidenceLinks.map((link) => (
                          <span
                            key={link.id}
                            className={cn(
                              'rounded-[4px] border px-2.5 py-1.5 text-[11px] font-semibold',
                              link.disabled
                                ? 'border-[#e7dcd2] bg-[#f3ede6] text-[#8c7a73]'
                                : 'border-plum-border bg-plum-soft text-plum',
                            )}
                          >
                            {link.label}
                          </span>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[6px] border border-[#e7dcd2] bg-panel p-3.5">
                      <div className="text-[11.5px] font-semibold text-espresso">Buyer Protection scope</div>
                      <div className="mt-2.5">
                        <div className="text-[10px] font-semibold tracking-[0.1em] text-[#8c7a73] uppercase">Covered</div>
                        <ul className="mt-1 space-y-1">
                          {PROTECTION_COVERED.map((item) => (
                            <li key={item} className="text-[11.5px] text-body">
                              · {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-3">
                        <div className="text-[10px] font-semibold tracking-[0.1em] text-[#8a2323] uppercase">
                          Not covered
                        </div>
                        <ul className="mt-1 space-y-1">
                          {PROTECTION_NOT_COVERED.map((item) => (
                            <li key={item} className="text-[11.5px] text-[#8a2323]">
                              · {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="rounded-[6px] border border-[#e7dcd2] bg-panel p-3.5">
                      <div className="mb-2 text-[11.5px] font-semibold text-espresso">Case action history</div>
                      {selected.history.map((h, i) => (
                        <div key={`${h.at}-${i}`} className="border-t border-[#f0e7de] py-2 first:border-0 first:pt-0">
                          <div className="text-[12px] text-espresso">{h.text}</div>
                          <div className="mt-0.5 text-[10.5px] text-muted">
                            {h.by} · {h.at}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!isDecided && selected.timeline.length ? (
                    <section>
                      <div className="mb-2 text-[11.5px] font-semibold text-espresso">Order timeline</div>
                      <div className="relative ml-2 border-l border-[#e7dcd2] pl-4">
                        {selected.timeline.map((item) => (
                          <div key={item.id} className="relative pb-3.5 last:pb-0">
                            <span
                              className={cn(
                                'absolute top-1 -left-[21px] size-2.5 rounded-full border-2 border-panel',
                                item.tone === 'warn'
                                  ? 'bg-[#b4762a]'
                                  : item.tone === 'danger'
                                    ? 'bg-[#9e2b2b]'
                                    : item.tone === 'ok'
                                      ? 'bg-[#3d7a55]'
                                      : 'bg-[#c4b5aa]',
                              )}
                            />
                            <div className="text-[10.5px] font-semibold tracking-[0.06em] text-[#8c7a73] uppercase">
                              {item.at}
                            </div>
                            <div className="text-[12.5px] font-semibold text-espresso">{item.title}</div>
                            {item.detail ? <div className="text-[11.5px] text-muted">{item.detail}</div> : null}
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-[12px] text-muted">Select a case to inspect.</div>
        )}
      </div>

      {confirmOpen && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={setConfirmOpen}
          title={`Confirm decision — ${selected.id}`}
          description="You are recording the final case decision. This closes the investigation and instructs Finance when a refund is required. The case cannot be re-decided from this console."
          confirmLabel="Record decision"
          requireCheckbox
          checkboxLabel="I have reviewed the case evidence and confirm this decision."
          defaultReason={reason}
          reasonLabel="Decision reason (recorded in audit log)"
          metaRows={[
            { label: 'Outcome', value: outcome },
            {
              label: 'Refund components',
              value:
                outcome === 'Refund buyer'
                  ? 'Calculated in the Refunds workflow under approved policy'
                  : 'None',
            },
            {
              label: 'Financial execution',
              value: outcome === 'Refund buyer' ? 'Awaiting Finance' : 'No Finance action required',
            },
            {
              label: 'Seller payout',
              value:
                outcome === 'Refund buyer'
                  ? 'Remains On Hold until Finance closes'
                  : outcome === 'Release to seller'
                    ? 'May continue'
                    : 'Follows normal completion',
            },
          ]}
          onConfirm={(finalReason) => {
            // Demo path: simulate a save error when reason contains "fail"
            if (/fail/i.test(finalReason)) {
              setSaveError(true);
              setConfirmOpen(false);
              show(`Decision not saved for ${selected.id}`);
              return;
            }
            const stamp = new Date().toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });
            setRecorded((prev) => ({
              ...prev,
              [selected.id]: {
                outcome,
                reason: finalReason,
                by: session ? `${session.name} · ${ROLE_LABELS[session.role]}` : 'Staff',
                at: stamp,
              },
            }));
            setSaveError(false);
            setConfirmOpen(false);
            show(`Decision recorded · ${selected.id} · ${outcome}`);
          }}
        />
      ) : null}
    </>
  );
}
