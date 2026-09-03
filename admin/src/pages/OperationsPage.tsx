import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { AiAdvisory } from '@/components/admin/ai-advisory';
import { EmptyState, ErrorState, LoadingState, OfflineBanner } from '@/components/admin/empty-state';
import { FilterChips } from '@/components/admin/filter-chips';
import { usePageChrome } from '@/components/layout/shell-chrome';
import { StatCard } from '@/components/admin/stat-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatNaira, mockBadgeCounts, mockOpsCases, mockSensitiveActions } from '@/data/mock';

type QueueTab = 'urgent' | 'all' | 'evidence';
type DemoState = 'ready' | 'loading' | 'empty' | 'partial' | 'offline' | 'error';

function aiTone(p: 'High' | 'Medium' | 'Normal') {
  if (p === 'High') return 'risk' as const;
  if (p === 'Medium') return 'hold' as const;
  return 'neutral' as const;
}

const SUPPORT_ROWS = [
  {
    id: 'DSP-4452',
    party: '@ada_e · ORD-88044',
    status: 'Decision made — refund approved',
    action: 'Contact buyer',
    href: '/disputes',
  },
  {
    id: 'DSP-4468',
    party: '@tolu.a · ORD-88190',
    status: 'Under review by Trust & Safety',
    action: 'Add note',
    href: '/disputes',
  },
  {
    id: 'SUP-7712',
    party: '@chidi_o · ORD-88144',
    status: 'Awaiting buyer information',
    action: 'Escalate',
    href: '/reports',
  },
];

const BAN_RECS = [
  { user: '@resell_ng', by: 'O. Bello (Trust & Safety)' },
  { user: '@quick_flip', by: 'F. Adeyemi (Trust & Safety)' },
];

export function OperationsPage() {
  const { session } = useAuth();
  const role = session?.role ?? 'trust_safety';
  const isFinance = role === 'finance';
  const isSupport = role === 'support';
  const isSuper = role === 'super_admin';
  const isTs = role === 'trust_safety';

  const [tab, setTab] = useState<QueueTab>('urgent');
  const [search, setSearch] = useState('');
  const [demoState, setDemoState] = useState<DemoState>('ready');

  usePageChrome({
    title: 'Operations',
    subtitle: `${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · queue state as of ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} WAT`,
    search,
    onSearchChange: setSearch,
    searchPlaceholder: 'Search users, orders, cases',
  });


  const cases = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockOpsCases.filter((c) => {
      if (c.role === 'finance') return false;
      if (tab === 'urgent' && !c.urgent) return false;
      if (tab === 'evidence' && !c.evidenceIncomplete) return false;
      if (!q) return true;
      return (
        c.id.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.detail.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    });
  }, [tab, search]);

  return (
    <>

      <div className="flex flex-col gap-5">
        <FilterChips
          value={demoState}
          onChange={(id) => setDemoState(id as DemoState)}
          options={[
            { id: 'ready', label: 'Ready' },
            { id: 'loading', label: 'Loading' },
            { id: 'empty', label: 'No urgent work' },
            { id: 'partial', label: 'Partial' },
            { id: 'offline', label: 'Offline' },
            { id: 'error', label: 'Error' },
          ]}
        />

        {demoState === 'offline' ? <OfflineBanner onRetry={() => setDemoState('ready')} /> : null}

        {demoState === 'loading' ? (
          <div className="rounded-[6px] border border-border-soft bg-panel px-4 py-6">
            <LoadingState label="Loading operations queue…" />
            <div className="mt-4 flex flex-col gap-2.5">
              <span className="block h-3 w-[44%] rounded-sm bg-divider" />
              <span className="block h-[52px] rounded bg-[#f5ede5]" />
              <span className="block h-[52px] rounded bg-[#f5ede5]" />
              <span className="block h-3 w-[64%] rounded-sm bg-divider" />
            </div>
          </div>
        ) : null}

        {demoState === 'error' ? (
          <div className="rounded-[6px] border border-risk-border bg-risk-bg px-4 py-5">
            <ErrorState
              title="Dashboard could not load"
              description="Something went wrong on our side. Try again, or open a module directly."
              onRetry={() => setDemoState('ready')}
            />
          </div>
        ) : null}

        {demoState === 'empty' ? (
          <div className="rounded-[6px] border border-dashed border-[#dccfc4] bg-panel px-6 py-12 text-center">
            <Check className="mx-auto size-6 text-clear" strokeWidth={1.7} />
            <div className="mt-2 font-display text-lg text-espresso">Queue is clear</div>
            <p className="mx-auto mt-1 max-w-sm text-[11.5px] text-muted">
              No urgent disputes, reports or live incidents assigned to you.
            </p>
          </div>
        ) : null}

        {demoState === 'ready' || demoState === 'partial' || demoState === 'offline' ? (
          <>
            {isFinance ? <FinanceDashboard /> : null}
            {isSupport ? <SupportDashboard /> : null}
            {isSuper ? <SuperAdminDashboard /> : null}
            {isTs ? (
              <TrustSafetyDashboard
                cases={cases}
                tab={tab}
                setTab={setTab}
                partial={demoState === 'partial'}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}

function FinanceDashboard() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Payouts eligible" value={9} hint={`${formatNaira(241300)} total`} accent="clear" />
        <StatCard label="On Hold" value={23} hint="Awaiting T&S outcome" accent="hold" />
        <StatCard label="Refunds to execute" value={mockBadgeCounts.refunds} hint="Approved by Trust & Safety" accent="plum" />
        <StatCard label="Failed operations" value={2} hint="1 payout · 1 refund" accent="risk" />
      </div>

      <div className="rounded-[5px] border border-border-soft bg-panel-elevated px-3.5 py-3">
        <div className="text-[12px] font-semibold text-espresso">Finance sees execution work only</div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-body">
          Dispute outcomes appear here as approved instructions. Finance cannot open a case decision. Moderation queues,
          reports and user safety history are not shown to this role.
        </p>
      </div>

      <div className="flex items-center gap-2.5 rounded-[5px] border border-hold-border bg-hold-bg px-3.5 py-2.5">
        <span className="rounded-[3px] border border-hold-border bg-panel px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.12em] text-hold uppercase">
          Test
        </span>
        <span className="text-[11.5px] text-[#7a5a22]">
          Payments, refunds and payouts are simulated in this environment. No real money moves.
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/refunds">Open Refunds</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/payouts">Open Payouts</Link>
        </Button>
      </div>
    </div>
  );
}

function SupportDashboard() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="My open cases" value={18} hint="6 awaiting my reply" accent="plum" />
        <StatCard label="Orders needing help" value={11} hint="Delivery queries" accent="hold" />
        <StatCard label="Escalations open" value={5} hint="With Trust & Safety" accent="gold" />
        <StatCard label="Decided, needs contact" value={3} hint="Communicate outcome" accent="clear" />
      </div>

      <div className="overflow-hidden rounded-[5px] border border-border-soft bg-panel">
        <div className="grid grid-cols-[96px_1fr_150px_120px] border-b border-border-soft bg-panel-elevated px-3.5 py-2 text-[9.5px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
          <span>Case</span>
          <span>Customer &amp; order</span>
          <span>Status</span>
          <span>Support action</span>
        </div>
        {SUPPORT_ROWS.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[96px_1fr_150px_120px] items-center border-b border-divider px-3.5 py-2.5 last:border-0"
          >
            <span className="text-[11.5px] font-semibold tabular-nums text-plum">{row.id}</span>
            <span className="text-[12px] text-espresso">{row.party}</span>
            <span className="text-[11px] text-body">{row.status}</span>
            <Link to={row.href} className="text-[11px] font-semibold text-plum">
              {row.action}
            </Link>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2.5 rounded-[5px] border border-[#dccfc4] bg-panel-elevated px-3.5 py-2.5">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-2" strokeWidth={1.7} />
        <p className="text-[11.5px] leading-relaxed text-body">
          Support cannot decide disputes or move money. Decision and financial controls are not shown to this role —
          only case status, permitted evidence, internal notes and escalation.
        </p>
      </div>
    </div>
  );
}

function SuperAdminDashboard() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[5px] border border-border-soft bg-panel px-3.5 py-3">
          <div className="text-[9.5px] font-semibold tracking-[0.12em] text-muted-2 uppercase">Disputes</div>
          <div className="mt-1.5 text-[12px] text-espresso">23 open · 6 urgent</div>
          <div className="mt-0.5 text-[11px] text-muted">3 decision ready</div>
        </div>
        <div className="rounded-[5px] border border-border-soft bg-panel px-3.5 py-3">
          <div className="text-[9.5px] font-semibold tracking-[0.12em] text-muted-2 uppercase">Moderation</div>
          <div className="mt-1.5 text-[12px] text-espresso">14 reports · 2 live</div>
          <div className="mt-0.5 text-[11px] text-muted">4 flagged users</div>
        </div>
        <div className="rounded-[5px] border border-border-soft bg-panel px-3.5 py-3">
          <div className="text-[9.5px] font-semibold tracking-[0.12em] text-muted-2 uppercase">Finance</div>
          <div className="mt-1.5 text-[12px] text-espresso">9 eligible · 23 held</div>
          <div className="mt-0.5 text-[11px] text-muted">2 failed operations</div>
        </div>
      </div>

      <div className="rounded-[5px] border border-border-soft bg-panel px-3.5 py-3">
        <div className="mb-1.5 text-[12px] font-semibold text-espresso">Ban recommendations awaiting Super Admin</div>
        {BAN_RECS.map((b) => (
          <div
            key={b.user}
            className="flex items-center justify-between border-t border-divider py-2.5 text-[12px]"
          >
            <span className="text-espresso">
              {b.user} · recommended by {b.by}
            </span>
            <Link to="/users" className="font-semibold text-plum">
              Review
            </Link>
          </div>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        Permanent bans are executed by Super Admin only, after confirmation and a recorded reason.
      </p>

      <div className="grid grid-cols-[1fr_372px] gap-5">
        <div className="rounded-[6px] border border-border-soft bg-panel px-4 py-[15px]">
          <div className="text-[13.5px] font-semibold text-espresso">Recent sensitive actions</div>
          <div className="mt-0.5 mb-3 text-[11px] text-muted">Human-executed · full record in Audit Log</div>
          {mockSensitiveActions.map((a) => (
            <div key={a.id} className="flex flex-col gap-0.5 border-t border-divider py-2.5">
              <div className="text-[12px] text-espresso">{a.title}</div>
              <div className="text-[11px] text-muted">{a.detail}</div>
            </div>
          ))}
        </div>
        <AiAdvisory recommendation="Review ban recommendations first, then open Disputes for DSP-4471.">
          Cross-role overview: 6 urgent disputes, 14 reports, and 4 refunds awaiting Finance. Super Admin can open any
          module.
        </AiAdvisory>
      </div>
    </div>
  );
}

function TrustSafetyDashboard({
  cases,
  tab,
  setTab,
  partial,
}: {
  cases: typeof mockOpsCases;
  tab: QueueTab;
  setTab: (t: QueueTab) => void;
  partial?: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Urgent disputes"
          value={6}
          meta="2 past 48h context"
          hint="Oldest opened 41h ago"
          accent="risk"
        />
        <StatCard
          label="Open disputes"
          value={mockBadgeCounts.disputes}
          meta="8 evidence incomplete"
          hint="All have payout On Hold"
          accent="plum"
        />
        <StatCard
          label="Reports to review"
          value={mockBadgeCounts.reports}
          meta="3 linked"
          hint="5 listings · 9 users"
          accent="hold"
        />
        {partial ? (
          <div className="rounded-[6px] border border-dashed border-hold-border bg-hold-bg px-[18px] py-4">
            <div className="text-[10px] font-semibold tracking-[0.14em] text-hold uppercase">Live incidents</div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-[#7a5a22]">
              Unavailable right now. Other queues are current.{' '}
              <button type="button" className="font-semibold underline">
                Retry
              </button>
            </p>
          </div>
        ) : (
          <StatCard
            label="Live incidents"
            value={mockBadgeCounts.live}
            meta="1 stream active"
            hint="Reported during broadcast"
            accent="gold"
          />
        )}
      </div>

      <div className="grid grid-cols-[1fr_372px] gap-5">
        <div className="flex flex-col overflow-hidden rounded-[6px] border border-border-soft bg-panel">
          <div className="flex items-start justify-between gap-3 border-b border-border-soft px-[18px] py-[15px]">
            <div>
              <div className="text-[14px] font-semibold text-espresso">
                Priority queue · assigned to Trust &amp; Safety
              </div>
              <div className="mt-0.5 text-[11px] text-muted">
                Ordered by AI-assigned urgency · human review required on every case
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {(
                [
                  { id: 'urgent' as const, label: 'Urgent' },
                  { id: 'all' as const, label: 'All open' },
                  { id: 'evidence' as const, label: 'Evidence incomplete' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'rounded border px-2.5 py-1 text-[11px] font-semibold transition',
                    tab === t.id
                      ? 'border-plum-border bg-plum-soft text-plum'
                      : 'border-[#dccfc4] text-body hover:border-espresso/30',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[104px_1fr_132px_78px_108px_116px] border-b border-border-soft bg-panel-elevated px-[18px] py-2.5 text-[9.5px] font-semibold tracking-[0.13em] text-muted-2 uppercase">
            <span>Case</span>
            <span>Subject</span>
            <span>Category</span>
            <span>Age</span>
            <span>AI priority</span>
            <span>Payout</span>
          </div>

          <div className="flex flex-col">
            {cases.length === 0 ? (
              <EmptyState title="No cases match" description="Try All open or clear search." />
            ) : (
              cases.map((c, i) => (
                <Link
                  key={c.id}
                  to={c.href}
                  className={cn(
                    'grid grid-cols-[104px_1fr_132px_78px_108px_116px] items-center border-b border-divider px-[18px] py-3 transition hover:bg-panel-elevated',
                    i === 0 && 'bg-[#f9f1ea]',
                  )}
                >
                  <span className="text-[12px] font-semibold tabular-nums text-plum">{c.id}</span>
                  <span className="flex min-w-0 flex-col gap-0.5 pr-2">
                    <span className="truncate text-[12.5px] text-espresso">{c.subject}</span>
                    <span className="truncate text-[11px] text-muted">{c.detail}</span>
                  </span>
                  <span className="text-[12px] text-body">{c.category}</span>
                  <span className={cn('text-[12px] tabular-nums', c.ageUrgent ? 'text-risk' : 'text-body')}>
                    {c.age}
                  </span>
                  <span>
                    <StatusBadge tone={aiTone(c.aiPriority)}>AI · {c.aiPriority}</StatusBadge>
                  </span>
                  <span>
                    {c.payout === 'On Hold' ? (
                      <StatusBadge tone="hold">On Hold</StatusBadge>
                    ) : (
                      <span className="text-[11.5px] text-muted-2">—</span>
                    )}
                  </span>
                </Link>
              ))
            )}
          </div>

          <div className="flex items-center justify-between px-[18px] py-2.5 text-[11px] text-muted">
            <span>
              Showing {cases.length} of {mockBadgeCounts.disputes} open cases
            </span>
            <Link to="/disputes" className="font-semibold text-plum">
              Open Disputes module
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <AiAdvisory recommendation="Review RPT-2210 first, then DSP-4471. Recommended destination: Disputes.">
            Repeated risk pattern detected across 3 linked reports naming seller{' '}
            <strong className="font-semibold">@style_by_k</strong>, all referencing the same listing type. Two open
            disputes share the same delivery courier and destination area.
          </AiAdvisory>

          <div className="flex flex-1 flex-col rounded-[6px] border border-border-soft bg-panel px-4 py-[15px]">
            <div className="text-[13.5px] font-semibold text-espresso">Recent sensitive actions</div>
            <div className="mt-0.5 mb-3 text-[11px] text-muted">Human-executed · full record in Audit Log</div>
            <div className="flex flex-col">
              {mockSensitiveActions.map((a) => (
                <div key={a.id} className="flex flex-col gap-0.5 border-t border-divider py-2.5">
                  <div className="text-[12px] text-espresso">{a.title}</div>
                  <div className="text-[11px] text-muted">{a.detail}</div>
                </div>
              ))}
            </div>
            <div className="mt-auto border-t border-divider pt-3 text-[11px] text-muted-2">
              Finance execution entries are visible to Finance and Super Admin only.
            </div>
          </div>

          <div className="rounded-[6px] border border-border-soft bg-panel px-4 py-[15px]">
            <div className="mb-3 text-[13.5px] font-semibold text-espresso">My workload</div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-body">Assigned disputes</span>
                <span className="font-semibold tabular-nums text-espresso">7</span>
              </div>
              <div className="h-[3px] overflow-hidden rounded-sm bg-divider">
                <span className="block h-[3px] w-[58%] bg-plum" />
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-body">Awaiting my decision</span>
                <span className="font-semibold tabular-nums text-espresso">3</span>
              </div>
              <div className="h-[3px] overflow-hidden rounded-sm bg-divider">
                <span className="block h-[3px] w-[26%] bg-hold" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
