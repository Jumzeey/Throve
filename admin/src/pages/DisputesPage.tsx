import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { AiAdvisory } from '@/components/admin/ai-advisory';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { FieldRow, RestrictedValue } from '@/components/admin/field-row';
import { FilterChips } from '@/components/admin/filter-chips';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { formatNaira, mockDisputes, type MockDispute } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { canAct } from '@/lib/roles';
import { usePageChrome } from '@/components/layout/shell-chrome';

function tone(s: MockDispute['status']) {
  if (s === 'Approved for refund') return 'clear' as const;
  if (s === 'With T&S') return 'hold' as const;
  if (s === 'Denied') return 'risk' as const;
  if (s === 'Closed') return 'neutral' as const;
  return 'plum' as const;
}

type Decision = 'Refund buyer' | 'Release to seller' | 'Partial refund';

export function DisputesPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(mockDisputes[0]?.id ?? null);
  const [decision, setDecision] = useState<Decision | null>(null);

  usePageChrome({
    title: "Disputes",
    subtitle: "Queue · AI recommendation · three human decision outcomes",
    hideSearch: true,
  });

  const canDecide = session ? canAct(session.role, 'decide_dispute') : false;
  const isFinance = session?.role === 'finance';
  const isSupport = session?.role === 'support';
  const selected = mockDisputes.find((d) => d.id === selectedId) ?? null;

  const rows = useMemo(() => {
    return mockDisputes.filter((d) => {
      if (filter === 'all') return true;
      if (filter === 'open') return d.status === 'Open' || d.status === 'With T&S';
      if (filter === 'approved') return d.status === 'Approved for refund';
      if (filter === 'closed') return d.status === 'Closed' || d.status === 'Denied';
      return true;
    });
  }, [filter]);

  return (
    <div className="flex flex-col gap-5">
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: 'All', count: mockDisputes.length },
          { id: 'open', label: 'Open / with T&S' },
          { id: 'approved', label: 'Approved for refund' },
          { id: 'closed', label: 'Closed / denied' },
        ]}
      />
      {banner}

      <div className="grid grid-cols-[1fr_1.15fr] gap-4">
        <div className="flex flex-col gap-3">
          {rows.length === 0 ? (
            <Panel>
              <EmptyState title="No disputes" />
            </Panel>
          ) : (
            rows.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedId(d.id)}
                className={`rounded-[5px] border px-4 py-3 text-left transition ${
                  d.id === selectedId
                    ? 'border-plum bg-plum-soft/40'
                    : 'border-border-soft bg-card hover:border-espresso/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge tone={tone(d.status)}>{d.status}</StatusBadge>
                  <StatusBadge tone={d.priority === 'P1' ? 'risk' : 'neutral'}>{d.priority}</StatusBadge>
                </div>
                <div className="mt-2 text-[13px] font-semibold text-espresso">{d.reason}</div>
                <div className="mt-0.5 text-[11.5px] text-muted">
                  {d.id} · {d.orderId} · {formatNaira(d.amount)}
                </div>
              </button>
            ))
          )}
        </div>

        <Panel title={selected?.id ?? 'Select a dispute'} subtitle={selected ? `Opened ${selected.openedAt}` : undefined}>
          {selected ? (
            <div className="flex flex-col gap-3">
              <AiAdvisory kind="RECOMMENDATION">{selected.aiRecommendation}</AiAdvisory>
              <div>
                <FieldRow label="Order">{selected.orderId}</FieldRow>
                <FieldRow label="Buyer">@{selected.buyer}</FieldRow>
                <FieldRow label="Seller">@{selected.seller}</FieldRow>
                <FieldRow label="Amount">{formatNaira(selected.amount)}</FieldRow>
                {selected.decision ? <FieldRow label="Decision">{selected.decision}</FieldRow> : null}
              </div>

              <div>
                <div className="mb-2 text-[11.5px] font-semibold text-espresso">Evidence</div>
                <ul className="flex flex-col gap-1.5">
                  {selected.evidence.map((e) => (
                    <li key={e.id} className="flex items-center justify-between rounded border border-border-soft px-3 py-2 text-[12px]">
                      <span>{e.label}</span>
                      {isSupport && e.restricted ? <RestrictedValue /> : null}
                    </li>
                  ))}
                </ul>
              </div>

              {canDecide && (selected.status === 'Open' || selected.status === 'With T&S') ? (
                <div className="flex flex-col gap-2">
                  <div className="text-[11.5px] font-semibold text-espresso">Human decision (required)</div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setDecision('Refund buyer')}>Refund buyer</Button>
                    <Button variant="outline" onClick={() => setDecision('Release to seller')}>
                      Release to seller
                    </Button>
                    <Button variant="outline" onClick={() => setDecision('Partial refund')}>
                      Partial refund
                    </Button>
                  </div>
                </div>
              ) : null}

              {isFinance && selected.status === 'Approved for refund' ? (
                <Button asChild>
                  <Link to="/refunds">Execute in Refunds</Link>
                </Button>
              ) : null}

              {isFinance && selected.status !== 'Approved for refund' ? (
                <p className="text-[11.5px] text-muted">
                  Finance sees outcome → Refunds CTA only. Case decisions are Trust &amp; Safety.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-[12px] text-muted">Choose a dispute card.</p>
          )}
        </Panel>
      </div>

      {decision && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setDecision(null)}
          title={`Decide: ${decision}`}
          description={`Record “${decision}” for ${selected.id} on ${selected.orderId}. Finance executes money moves separately.`}
          confirmLabel="Record decision"
          requireCheckbox
          onConfirm={(reason) => {
            show(`Decision “${decision}” · ${selected.id} · ${reason.slice(0, 36)}`);
            setDecision(null);
          }}
        />
      ) : null}
    </div>
  );
}
