import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { useBleedSelection } from '@/hooks/use-bleed-selection';
import { AiAdvisory } from '@/components/admin/ai-advisory';
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
import { mockAudit, type MockAudit } from '@/data/mock';
import { useListWindow } from '@/hooks/use-list-window';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS, type AdminRole } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

type DateFilter = '7d' | '30d' | 'all';
type ModuleFilter = 'all' | MockAudit['module'];
type ResultFilter = 'all' | MockAudit['result'];
type RoleFilter = 'all' | string;

function resultTone(r: MockAudit['result']): StatusTone {
  return r === 'Completed' ? 'clear' : 'risk';
}

function sensitivityTone(s: MockAudit['sensitivity']): StatusTone {
  if (s === 'High') return 'risk';
  if (s === 'Medium') return 'hold';
  if (s === 'Access') return 'gold';
  return 'neutral';
}

function roleScopeCopy(role: AdminRole) {
  if (role === 'finance') {
    return {
      title: 'Scope · Finance',
      body: 'Finance sees financial-action history plus the dispute outcomes that drive it — not the wider moderation record.',
      rows: [
        { label: 'Refund executed · REF-3298', state: 'Visible' },
        { label: 'Payout processed · PAY-9964', state: 'Visible' },
        { label: 'Dispute outcome · DSP-4471', state: 'Outcome only' },
        { label: 'Moderation and Live enforcement events', state: 'Not in scope', dim: true },
      ],
    };
  }
  if (role === 'trust_safety') {
    return {
      title: 'Scope · Trust & Safety',
      body: 'Case and moderation history in full; financial execution only as far as a case requires.',
      rows: [
        { label: 'Dispute decisions', state: 'Visible' },
        { label: 'Moderation & Live enforcement', state: 'Visible' },
        { label: 'Payout holds on their cases', state: 'Status only' },
        { label: 'Refund and payout execution detail', state: 'Not in scope', dim: true },
      ],
    };
  }
  if (role === 'support') {
    return {
      title: 'Scope · Customer Support',
      body: 'Limited operational context only. Cross-platform audit history is not part of this role.',
      rows: [
        { label: 'Their own notes and escalations', state: 'Visible' },
        { label: 'Case status changes on their cases', state: 'Status only' },
        { label: 'Enforcement, finance and access events', state: 'Not in scope', dim: true },
      ],
    };
  }
  return null;
}

export function AuditPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [dateFilter, setDateFilter] = useState<DateFilter>('7d');
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const role = (session?.role ?? 'support') as AdminRole;
  const isSuper = role === 'super_admin';
  const scope = roleScopeCopy(role);

  const visibleEvents = useMemo(
    () => mockAudit.filter((a) => a.visibility[role] != null),
    [role],
  );

  usePageChrome({
    title: 'Audit log',
    subtitle: 'Sensitive admin actions and access events — read-only record',
    search,
    onSearchChange: setSearch,
    searchPlaceholder: 'Admin, record or reference',
    bleed: true,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleEvents.filter((a) => {
      if (moduleFilter !== 'all' && a.module !== moduleFilter) return false;
      if (resultFilter !== 'all' && a.result !== resultFilter) return false;
      if (roleFilter !== 'all' && a.role !== roleFilter) return false;
      // Demo: "Last 7 days" keeps seeded Aug rows; "all" same set; empty demo handled separately
      if (dateFilter === '30d' && a.id === 'AUD-118070') return false;
      if (!q) return true;
      return (
        a.id.toLowerCase().includes(q) ||
        a.actor.toLowerCase().includes(q) ||
        a.action.toLowerCase().includes(q) ||
        a.recordId.toLowerCase().includes(q) ||
        a.module.toLowerCase().includes(q) ||
        (a.recordSub?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [visibleEvents, moduleFilter, resultFilter, roleFilter, dateFilter, search]);

  const [selectedId, setSelectedId] = useBleedSelection(rows[0]?.id ?? null);

  const listWindow = useListWindow(rows);

  const selected =
    (selectedId ? visibleEvents.find((a) => a.id === selectedId) : null) ??
    (rows[0] ?? null);
  const depth = selected ? selected.visibility[role] : null;
  const showFullDetail = depth === 'full' || isSuper;
  const showOutcomeOnly = depth === 'outcome_only';
  const showStatusOnly = depth === 'status_only';

  const modules = useMemo(
    () => Array.from(new Set(visibleEvents.map((a) => a.module))).sort(),
    [visibleEvents],
  );
  const actorRoles = useMemo(
    () => Array.from(new Set(visibleEvents.map((a) => a.role))).sort(),
    [visibleEvents],
  );

  async function copyReference(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      show(`Copied ${id}`);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      show('Could not copy');
    }
  }

  const auditDesktopCols =
    'grid-cols-[72px_minmax(0,1fr)_72px_minmax(0,1.2fr)_78px_72px_36px] items-center gap-x-2 py-3.5';

  return (
    <>
      <BleedSplit
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        gridClassName="grid-cols-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]"
        inspectorTitle="Audit event"
        list={
          <>
            <div className="space-y-3 border-b border-[#e7dcd2] px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <FilterChips
                  value={dateFilter}
                  onChange={(id) => setDateFilter(id as DateFilter)}
                  options={[
                    { id: '7d', label: 'Last 7 days' },
                    { id: '30d', label: 'Last 30 days' },
                    { id: 'all', label: 'All time' },
                  ]}
                />
                <span className="ml-auto text-[11.5px] tabular-nums text-body">
                  {rows.length} event{rows.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterChips
                  tone="soft"
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={[
                    { id: 'all', label: 'Admin role' },
                    ...actorRoles.map((r) => ({ id: r, label: r })),
                  ]}
                />
                <FilterChips
                  tone="soft"
                  value={moduleFilter}
                  onChange={(id) => setModuleFilter(id as ModuleFilter)}
                  options={[
                    { id: 'all', label: 'Module' },
                    ...modules.map((m) => ({ id: m, label: m })),
                  ]}
                />
                <FilterChips
                  tone="soft"
                  value={resultFilter}
                  onChange={(id) => setResultFilter(id as ResultFilter)}
                  options={[
                    { id: 'all', label: 'Result' },
                    { id: 'Completed', label: 'Completed' },
                    { id: 'Denied', label: 'Denied' },
                  ]}
                />
              </div>
              {banner}
              {!isSuper && scope ? (
                <Alert className="rounded-[5px] border-dashed border-[#d4c8bc] bg-transparent">
                  <Lock className="size-3.5 text-body" />
                  <AlertTitle className="text-[11px] font-semibold text-espresso">Permission-limited view</AlertTitle>
                  <AlertDescription className="text-[11px] text-body">
                    Events outside your role&apos;s scope are not listed. The log does not reveal what it withholds.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>

            <div ref={listWindow.scrollRef} className="min-h-0 flex-1 overflow-auto">
              {rows.length === 0 ? (
                <EmptyState
                  title="No events in this range"
                  description="Widen the date range or clear the module filter."
                  actionLabel="Clear filters"
                  onAction={() => {
                    setDateFilter('7d');
                    setModuleFilter('all');
                    setResultFilter('all');
                    setRoleFilter('all');
                    setSearch('');
                  }}
                />
              ) : null}

              {rows.length > 0 ? (
                <>
                  <ExpandableListHeader
                    desktopClassName={auditDesktopCols}
                    columns={
                      <>
                        <span>When</span>
                        <span>Actor · role</span>
                        <span>Module</span>
                        <span>Action · record</span>
                        <span>Result</span>
                        <span>Sensitivity</span>
                        <span>AI</span>
                      </>
                    }
                  />
                  {listWindow.visible.map((a) => {
                    const active = a.id === (selected?.id ?? selectedId);
                    return (
                      <ExpandableListRow
                        key={a.id}
                        selected={active}
                        onSelect={() => setSelectedId(a.id)}
                        desktopClassName={auditDesktopCols}
                        primary={
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] tabular-nums text-body">{a.at}</span>
                              <StatusBadge tone={resultTone(a.result)}>{a.result}</StatusBadge>
                            </div>
                            <div className="mt-1 truncate text-[12.5px] font-semibold text-espresso">{a.action}</div>
                            <div className="mt-0.5 truncate text-[11.5px] text-body">
                              {a.actor} · {a.module}
                            </div>
                          </div>
                        }
                        details={[
                          {
                            label: 'Actor',
                            value: (
                              <span>
                                {a.actor}
                                <span className="block text-body">{a.role}</span>
                              </span>
                            ),
                          },
                          { label: 'Module', value: a.module },
                          {
                            label: 'Record',
                            value: (
                              <span className="font-mono">
                                {a.recordId}
                                {a.recordSub ? ` · ${a.recordSub}` : ''}
                              </span>
                            ),
                          },
                          {
                            label: 'Sensitivity',
                            value: (
                              <StatusBadge tone={sensitivityTone(a.sensitivity)}>{a.sensitivity}</StatusBadge>
                            ),
                          },
                          ...(a.hasAi
                            ? [{ label: 'AI', value: <StatusBadge tone="plum">AI</StatusBadge> }]
                            : []),
                        ]}
                      >
                        <span className="text-[11px] tabular-nums text-body">{a.at}</span>
                        <div className="min-w-0">
                          <div className="truncate text-[12.5px] font-semibold text-espresso">{a.actor}</div>
                          <div className="truncate text-[11px] text-body">{a.role}</div>
                        </div>
                        <span className="truncate text-[11.5px] text-body">{a.module}</span>
                        <div className="min-w-0">
                          <div className="truncate text-[12.5px] font-semibold text-espresso">{a.action}</div>
                          <div className="truncate font-mono text-[11px] text-body">
                            {a.recordId}
                            {a.recordSub ? ` · ${a.recordSub}` : ''}
                          </div>
                        </div>
                        <StatusBadge tone={resultTone(a.result)}>{a.result}</StatusBadge>
                        <StatusBadge tone={sensitivityTone(a.sensitivity)}>{a.sensitivity}</StatusBadge>
                        <span>{a.hasAi ? <StatusBadge tone="plum">AI</StatusBadge> : null}</span>
                      </ExpandableListRow>
                    );
                  })}
                  <ListWindowFooter {...listWindow} />
                  <p className="border-t border-[#e7dcd2] px-4 py-3 text-[11px] leading-relaxed text-body">
                    The log is read-only in this console: no edit, delete, reason rewrite, actor change or timestamp
                    change exists for any role, including Super Admin.
                  </p>
                </>
              ) : null}
            </div>
          </>
        }
        inspector={
          !selected ? (
            <div className="flex flex-1 items-center justify-center px-6 text-[12.5px] text-body">
              Select an event to inspect.
            </div>
          ) : (
            <>
              <div className="border-b border-[#e7dcd2] px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CopyableId value={selected.id} variant="display" />
                    <div className="mt-2 text-[12.5px] text-body">
                      {selected.action} · {selected.atFull}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge tone={sensitivityTone(selected.sensitivity)}>
                      {selected.sensitivity === 'Access' ? 'Access' : `${selected.sensitivity} sensitivity`}
                    </StatusBadge>
                    <StatusBadge tone={resultTone(selected.result)}>{selected.result}</StatusBadge>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-4">

                {selected.deniedBanner ? (
                  <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                    <AlertTitle className="text-[12px] text-risk">{selected.deniedBanner.title}</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-risk">
                      {selected.deniedBanner.body}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.recordUnavailable ? (
                  <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                    <AlertTitle className="text-[12px] text-[#8a5a15]">Affected record no longer accessible</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                      The audit event is retained in full. Only the link to the live record is unavailable.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Alert className="rounded-[5px] border-border-soft bg-[#f3ede6]">
                  <AlertTitle className="text-[12px] text-espresso">Read-only record</AlertTitle>
                  <AlertDescription className="text-[11.5px] text-body">
                    No edit, delete, reason rewrite, actor change or timestamp change is offered to any role.
                    Corrections are new events.
                  </AlertDescription>
                </Alert>

                {!isSuper && scope ? (
                  <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                        {scope.title}
                      </div>
                      <StatusBadge tone="plum">{ROLE_LABELS[role]}</StatusBadge>
                    </div>
                    <div className="divide-y divide-[#ebe3da] text-[12px]">
                      {scope.rows.map((row) => (
                        <div
                          key={row.label}
                          className={cn(
                            'flex justify-between gap-3 py-2',
                            row.dim && 'text-[rgba(62,43,54,0.45)]',
                          )}
                        >
                          <span>{row.label}</span>
                          <span className="shrink-0 font-semibold">{row.state}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2.5 text-[11px] leading-relaxed text-body">{scope.body}</p>
                  </div>
                ) : null}

                <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3">
                  <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Who, what, when
                  </div>
                  <div className="mt-2 space-y-1.5 text-[12.5px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-body">Acting admin</span>
                      <span className="font-semibold text-espresso">{selected.actor}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-body">Role</span>
                      <span className="font-semibold text-espresso">{selected.role}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-body">Module</span>
                      <span className="font-semibold text-espresso">{selected.module}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-body">Timestamp</span>
                      <span className="text-right font-semibold text-espresso">{selected.atFull}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-body">Record</span>
                      <span className="text-right font-mono text-[11.5px] font-semibold text-espresso">
                        {selected.recordId}
                        {selected.recordSub ? ` · ${selected.recordSub}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {(showFullDetail || showOutcomeOnly) &&
                (selected.previousState || selected.resultingState) ? (
                  <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3">
                    <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      State change
                    </div>
                    <div className="mt-2 space-y-1.5 text-[12.5px]">
                      {selected.previousState ? (
                        <div className="flex justify-between gap-2">
                          <span className="text-body">Previous state</span>
                          <span className="font-semibold text-espresso">{selected.previousState}</span>
                        </div>
                      ) : null}
                      {selected.resultingState ? (
                        <div className="flex justify-between gap-2">
                          <span className="text-body">Resulting state</span>
                          <span className="font-semibold text-espresso">{selected.resultingState}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {showStatusOnly && !showFullDetail ? (
                  <Alert className="rounded-[5px] border-border-soft bg-[#f3ede6]">
                    <AlertTitle className="text-[12px] text-espresso">Status only</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-body">
                      Your role sees that this event occurred. Execution detail and amounts are outside scope.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {showFullDetail && selected.reason ? (
                  <div>
                    <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Reason recorded
                    </div>
                    <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3 text-[12.5px] leading-relaxed text-espresso">
                      {selected.reason}
                      <p className="mt-2 text-[11px] text-body">
                        Reasons cannot be rewritten. Corrections are recorded as new events.
                      </p>
                    </div>
                  </div>
                ) : null}

                {showFullDetail && selected.confirmation ? (
                  <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3">
                    <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Confirmation context
                    </div>
                    <div className="mt-2 space-y-1.5 text-[12.5px]">
                      {selected.confirmation.recommendedBy ? (
                        <div className="flex justify-between gap-2">
                          <span className="text-body">Recommended by</span>
                          <span className="text-right font-semibold text-espresso">
                            {selected.confirmation.recommendedBy}
                          </span>
                        </div>
                      ) : null}
                      {selected.confirmation.steps ? (
                        <div className="flex justify-between gap-2">
                          <span className="text-body">Confirm path</span>
                          <span className="text-right font-semibold text-espresso">
                            {selected.confirmation.steps}
                          </span>
                        </div>
                      ) : null}
                      {selected.confirmation.aiAssisted != null ? (
                        <div className="flex justify-between gap-2">
                          <span className="text-body">AI assistance</span>
                          <span className="font-semibold text-espresso">
                            {selected.confirmation.aiAssisted ? 'Used · advisory only' : 'Not used'}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {showFullDetail && selected.relatedEvents && selected.relatedEvents.length > 0 ? (
                  <div>
                    <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Related events
                    </div>
                    <div className="overflow-hidden rounded-[8px] border border-[#ebe3da]">
                      {selected.relatedEvents.map((ev) => (
                        <div
                          key={`${ev.id}-${ev.label}`}
                          className="flex items-center justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5 last:border-0"
                        >
                          <div>
                            <div className="text-[12.5px] font-semibold text-espresso">{ev.label}</div>
                            <div className="font-mono text-[11px] text-body">{ev.id}</div>
                          </div>
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-plum hover:underline"
                            onClick={() => {
                              const match = mockAudit.find((a) => a.id === ev.id);
                              if (match && match.visibility[role]) setSelectedId(match.id);
                              else show(`${ev.openLabel} · ${ev.id}`);
                            }}
                          >
                            {ev.openLabel}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {showFullDetail && selected.hasAi && selected.aiSummary ? (
                  <AiAdvisory kind="SUMMARY">{selected.aiSummary}</AiAdvisory>
                ) : null}

                <div className="flex items-start gap-2 text-[11px] leading-relaxed text-body">
                  <Lock className="mt-0.5 size-3.5 shrink-0 text-body" />
                  <span>
                    No credentials, tokens, identity documents or unnecessary personal data are recorded in audit
                    events.
                  </span>
                </div>
              </div>

              <div className="border-t border-[#e7dcd2] bg-[#fbf7f2] px-5 py-4">
                <div className="mb-2.5 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                  Actions · read only
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.affectedRecordPath && !selected.recordUnavailable ? (
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Link to={selected.affectedRecordPath}>
                        {selected.affectedRecordLabel ?? 'Open affected record'}
                      </Link>
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" disabled>
                      Open affected record
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copyReference(selected.id)}
                  >
                    {copied ? 'Copied' : 'Copy reference'}
                  </Button>
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                  Reading and navigating only. There is no edit or delete control anywhere on this screen.
                </p>
              </div>
            </>
          )
        }
      />
    </>
  );
}
