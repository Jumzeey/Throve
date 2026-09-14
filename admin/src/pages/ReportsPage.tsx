import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, roleLabel } from '@/auth/AuthContext';
import { AiAdvisory } from '@/components/admin/ai-advisory';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState, ErrorState, LoadingState, OfflineBanner } from '@/components/admin/empty-state';
import { FilterChips } from '@/components/admin/filter-chips';
import { StatusBadge, type StatusTone } from '@/components/admin/status-badge';
import { Timeline } from '@/components/admin/timeline';
import { usePageChrome } from '@/components/layout/shell-chrome';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { mockReports, type MockReport } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

type DemoState = 'ready' | 'loading' | 'empty' | 'error' | 'offline';
type QueueFilter =
  | 'open'
  | 'high'
  | 'repeat'
  | 'escalated'
  | 'action_taken'
  | 'closed'
  | 'assigned_me';
type ConfirmKind = 'close' | 'escalate' | 'associate' | 'note' | null;

type ReportOverride = {
  status?: MockReport['status'];
  history?: MockReport['history'];
  flash?: string | null;
  assigned?: string;
};

function statusTone(s: MockReport['status']): StatusTone {
  if (s === 'New') return 'hold';
  if (s === 'Under review') return 'neutral';
  if (s === 'Escalated') return 'plum';
  if (s === 'Action taken') return 'clear';
  if (s === 'Closed') return 'neutral';
  return 'neutral';
}

function aiTone(p: MockReport['aiPriority']): StatusTone {
  if (p === 'High') return 'risk';
  if (p === 'Medium') return 'hold';
  return 'neutral';
}

function moduleFor(route: MockReport['route']) {
  if (route === 'Listing') return { to: '/listings', label: 'Listings', act: 'Act in Listings' };
  if (route === 'User') return { to: '/users', label: 'Users', act: 'Act in Users' };
  return { to: '/live', label: 'Live', act: 'Act in Live' };
}

function isOpenStatus(s: MockReport['status']) {
  return s === 'New' || s === 'Under review';
}

export function ReportsPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [queue, setQueue] = useState<QueueFilter>('open');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(mockReports[0]?.id ?? null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [demoState, setDemoState] = useState<DemoState>('ready');
  const [overrides, setOverrides] = useState<Record<string, ReportOverride>>({});
  const [noteDraft, setNoteDraft] = useState('');

  const isSupport = session?.role === 'support';
  const canEnforce = session?.role === 'super_admin' || session?.role === 'trust_safety';

  const reports = useMemo(
    () =>
      mockReports.map((r) => {
        const o = overrides[r.id];
        if (!o) return r;
        return {
          ...r,
          status: o.status ?? r.status,
          history: o.history ?? r.history,
          assigned: o.assigned ?? r.assigned,
        };
      }),
    [overrides],
  );

  const awaiting = reports.filter((r) => isOpenStatus(r.status)).length;
  const linked = reports.filter((r) => r.linkedReports.length > 0).length;
  const assignedToMeCount = reports.filter((r) => r.assignedToMe || r.assigned === session?.name).length;

  usePageChrome({
    title: 'Reports',
    subtitle: `${awaiting} awaiting review · ${linked} linked · routes: user · listing · Live · Live comment`,
    search,
    onSearchChange: setSearch,
    searchPlaceholder: 'Report, object or username',
    bleed: true,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (queue === 'open' && !isOpenStatus(r.status)) return false;
      if (queue === 'high' && r.aiPriority !== 'High') return false;
      if (queue === 'repeat' && !(r.isRepeat || r.linkedReports.length >= 2)) return false;
      if (queue === 'escalated' && r.status !== 'Escalated') return false;
      if (queue === 'action_taken' && r.status !== 'Action taken') return false;
      if (queue === 'closed' && r.status !== 'Closed') return false;
      if (queue === 'assigned_me' && !(r.assignedToMe || r.assigned === session?.name)) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.target.toLowerCase().includes(q) ||
        r.objectTitle.toLowerCase().includes(q) ||
        r.objectMeta.toLowerCase().includes(q) ||
        r.reporter.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [reports, queue, search, session?.name]);

  const selected = reports.find((r) => r.id === selectedId) ?? null;
  const selectedFlash = selected ? overrides[selected.id]?.flash : null;
  const mod = selected ? moduleFor(selected.route) : null;

  function patchReport(id: string, next: ReportOverride) {
    setOverrides((current) => ({
      ...current,
      [id]: { ...current[id], ...next },
    }));
  }

  function appendHistory(report: MockReport, entry: MockReport['history'][number]): MockReport['history'] {
    return [entry, ...(overrides[report.id]?.history ?? report.history)];
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
              Screen preview states
            </div>
            <FilterChips
              tone="soft"
              value={demoState}
              onChange={(id) => setDemoState(id as DemoState)}
              options={[
                { id: 'ready', label: 'Ready' },
                { id: 'loading', label: 'Loading' },
                { id: 'empty', label: 'No results' },
                { id: 'error', label: 'Error' },
                { id: 'offline', label: 'Offline' },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <FilterChips
                value={queue}
                onChange={(id) => setQueue(id as QueueFilter)}
                options={[
                  { id: 'open', label: 'New & under review', count: awaiting },
                  { id: 'high', label: 'High priority' },
                  { id: 'repeat', label: 'Repeat reports' },
                  { id: 'escalated', label: 'Escalated' },
                  { id: 'action_taken', label: 'Action taken' },
                  { id: 'closed', label: 'Closed' },
                ]}
              />
              <button
                type="button"
                onClick={() => setQueue('assigned_me')}
                className={cn(
                  'ml-auto rounded border px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
                  queue === 'assigned_me'
                    ? 'border-plum bg-plum-soft text-plum'
                    : 'border-[#e2d7cc] bg-panel text-body hover:bg-[#fbf5ef]',
                )}
              >
                Assigned to me · {assignedToMeCount}
              </button>
            </div>
            {banner}
            {demoState === 'offline' ? <OfflineBanner onRetry={() => setDemoState('ready')} /> : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {demoState === 'loading' ? <LoadingState label="Loading reports…" /> : null}

            {demoState === 'error' ? (
              <ErrorState
                title="Queue could not load"
                description="Nothing was changed. Retry when the connection is stable."
                onRetry={() => setDemoState('ready')}
              />
            ) : null}

            {demoState === 'empty' || (demoState === 'ready' && rows.length === 0) ? (
              <EmptyState
                title="No open reports"
                description="Nothing awaiting review in this filter."
                actionLabel="Reset filters"
                onAction={() => {
                  setQueue('open');
                  setSearch('');
                  setDemoState('ready');
                }}
              />
            ) : null}

            {(demoState === 'ready' || demoState === 'offline') && rows.length > 0 ? (
              <>
                <div className="sticky top-0 z-[1] grid grid-cols-[88px_92px_minmax(0,1.35fr)_minmax(0,1fr)_52px_100px_108px] border-b border-[#e7dcd2] bg-[#fbf5ef] px-4 py-2.5 text-[9.5px] font-semibold tracking-[0.13em] text-muted-2 uppercase">
                  <span>Report</span>
                  <span>Type</span>
                  <span>Reported object</span>
                  <span>Category</span>
                  <span>Age</span>
                  <span>AI priority</span>
                  <span>Status</span>
                </div>
                {rows.map((r) => {
                  const active = r.id === selectedId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={demoState === 'offline'}
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        'grid w-full grid-cols-[88px_92px_minmax(0,1.35fr)_minmax(0,1fr)_52px_100px_108px] items-center border-b border-[#f0e7de] px-4 py-3 text-left last:border-0',
                        active ? 'bg-[#f9f1ea]' : 'bg-panel hover:bg-[#fbf5ef]',
                        demoState === 'offline' && 'opacity-60',
                      )}
                    >
                      <span className="font-mono text-[11px] font-semibold text-plum">{r.id}</span>
                      <span className="truncate text-[11.5px] text-body">{r.route}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold text-espresso">{r.objectTitle}</span>
                        <span className="block truncate text-[11px] text-body">
                          {r.target} · {r.objectMeta}
                        </span>
                      </span>
                      <span className="truncate text-[11.5px] text-body">{r.category}</span>
                      <span className="text-[11.5px] tabular-nums text-body">{r.ageLabel}</span>
                      <span>
                        <StatusBadge tone={aiTone(r.aiPriority)}>AI · {r.aiPriority}</StatusBadge>
                      </span>
                      <span>
                        <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                      </span>
                    </button>
                  );
                })}
                <p className="px-4 py-3 text-[11px] leading-relaxed text-body">
                  Categories stay deliberately broad. Throve’s full policy taxonomy is not settled in this hi-fi.
                </p>
              </>
            ) : null}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col bg-panel">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center px-6 text-[12.5px] text-body">
              Select a report to inspect.
            </div>
          ) : demoState === 'error' ? (
            <div className="flex flex-1 flex-col justify-center gap-3 px-5">
              <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                <AlertTitle className="text-[12px] text-risk">Queue could not load — nothing was changed</AlertTitle>
                <AlertDescription className="text-[11.5px] text-risk">
                  <button type="button" className="font-semibold underline" onClick={() => setDemoState('ready')}>
                    Retry
                  </button>
                </AlertDescription>
              </Alert>
              <Alert className="rounded-[5px] border-border-soft bg-[#f3ede6]">
                <AlertTitle className="text-[12px] text-espresso">Offline</AlertTitle>
                <AlertDescription className="text-[11.5px] text-body">
                  Notes and case actions are unavailable while offline.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <>
              <div className="border-b border-[#e7dcd2] px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[11px] font-semibold text-muted-2">{selected.id}</div>
                    <div className="mt-0.5 font-display text-[20px] leading-tight text-espresso">{selected.reason}</div>
                    <div className="mt-1 text-[12px] leading-snug text-body">
                      {selected.route} report · submitted {selected.createdAt}
                      {selected.assigned !== 'Unassigned' ? ` · assigned to ${selected.assigned}` : ' · unassigned'}
                    </div>
                  </div>
                  <StatusBadge tone={statusTone(selected.status)}>{selected.status}</StatusBadge>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-4">
                {selectedFlash ? (
                  <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                    <AlertTitle className="text-[12px] text-clear">Action recorded</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-clear">{selectedFlash}</AlertDescription>
                  </Alert>
                ) : null}

                {(selected.isRepeat || selected.linkedReports.length >= 2) && isOpenStatus(selected.status) ? (
                  <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                    <AlertTitle className="text-[12px] text-risk">
                      {selected.linkedReports.length + 1} reports · same object, distinct reporters
                    </AlertTitle>
                    <AlertDescription className="text-[11.5px] text-risk">
                      Associated as one case for review. No automatic action taken.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.status === 'Action taken' && selected.actionTakenNote ? (
                  <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                    <AlertTitle className="text-[12px] text-clear">{selected.actionTakenNote}</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-clear">
                      {selected.assigned} (Trust & Safety) · report set to Action taken
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.aiUnavailable ? (
                  <Alert className="rounded-[5px] border-border-soft bg-[#f3ede6]">
                    <AlertTitle className="text-[12px] text-espresso">No AI classification for this report</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-body">
                      Review manually. Queue position falls back to submission time.
                    </AlertDescription>
                  </Alert>
                ) : selected.aiSummary ? (
                  <AiAdvisory
                    recommendation={
                      selected.aiNextStep ? <>Recommended next step: {selected.aiNextStep}.</> : undefined
                    }
                  >
                    {selected.aiSummary}
                  </AiAdvisory>
                ) : null}

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Reporter statement
                  </div>
                  <blockquote className="rounded-[5px] border border-[#e7dcd2] bg-[#fbf7f2] px-3.5 py-3 text-[12.5px] leading-relaxed text-espresso">
                    “{selected.reporterStatement}”
                    <footer className="mt-2 text-[11px] text-body">— @{selected.reporter}</footer>
                  </blockquote>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Reported object
                  </div>
                  <div className="flex gap-3 rounded-[5px] border border-[#e7dcd2] bg-[#fbf7f2] px-3.5 py-3">
                    <div className="size-14 shrink-0 rounded-[4px] border border-[#e2d7cc] bg-[#efe6dd]" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold text-espresso">{selected.objectTitle}</div>
                      <div className="mt-0.5 text-[11.5px] text-body">
                        {selected.target} · {selected.category}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-body">{selected.objectMeta}</div>
                      {mod ? (
                        <Link to={mod.to} className="mt-2 inline-block text-[11.5px] font-semibold text-plum hover:underline">
                          Open in {mod.label}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Linked records
                  </div>
                  <div className="overflow-hidden rounded-[5px] border border-[#e7dcd2]">
                    {selected.linkedReports.length === 0 ? (
                      <div className="px-3 py-2.5 text-[11.5px] text-body">No linked reports</div>
                    ) : (
                      selected.linkedReports.map((lr) => (
                        <div
                          key={lr.id}
                          className="flex items-center justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5 last:border-0"
                        >
                          <div>
                            <div className="font-mono text-[11px] font-semibold text-espresso">{lr.id}</div>
                            <div className="text-[11px] text-body">{lr.label}</div>
                          </div>
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-plum hover:underline"
                            onClick={() => {
                              if (reports.some((r) => r.id === lr.id)) setSelectedId(lr.id);
                              else show(`Open ${lr.id} · not in this queue seed`);
                            }}
                          >
                            Open report
                          </button>
                        </div>
                      ))
                    )}
                    {selected.route === 'Listing' || selected.route === 'User' ? (
                      <div className="flex items-center justify-between gap-3 border-t border-[#e7dcd2] bg-[#fbf5ef] px-3 py-2.5">
                        <div>
                          <div className="text-[10px] text-muted-2 uppercase">
                            {selected.route === 'User' ? 'Reported user' : 'Seller account'}
                          </div>
                          <div className="text-[12px] font-semibold text-espresso">{selected.objectMeta}</div>
                        </div>
                        <Link to="/users" className="text-[11px] font-semibold text-plum hover:underline">
                          Open user
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[5px] border border-dashed border-plum-border bg-plum-soft px-3.5 py-3">
                  <div className="flex items-start gap-2">
                    <Lock className="mt-0.5 size-3.5 shrink-0 text-plum" />
                    <div>
                      <div className="text-[11px] font-semibold text-plum">Evidence privacy</div>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-body">
                        {isSupport && selected.evidenceRestricted
                          ? 'Evidence is Restricted for Customer Support. Escalate to Trust & Safety for full access.'
                          : `${selected.evidenceCount} evidence item${selected.evidenceCount === 1 ? '' : 's'} · only relevant evidence is surfaced.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Action history
                  </div>
                  {selected.history.length === 0 ? (
                    <p className="text-[11.5px] text-body">No events yet.</p>
                  ) : (
                    <Timeline events={selected.history} />
                  )}
                </div>

                {isSupport ? (
                  <Alert className="rounded-[5px] border-dashed border-plum-border bg-plum-soft">
                    <Lock className="size-3.5 text-plum" />
                    <AlertTitle className="text-[11px] font-semibold text-plum">Customer Support</AlertTitle>
                    <AlertDescription className="text-[11px] text-body">
                      Support cannot remove listings, suspend accounts, or close enforcement cases. Notes and escalate
                      only.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <div className="border-t border-[#e7dcd2] bg-[#fbf7f2] px-5 py-4">
                <div className="mb-2.5 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                  Actions · {session ? ROLE_LABELS[session.role] : 'Staff'}
                </div>
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
                  {canEnforce ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={demoState === 'offline'}
                        onClick={() => setConfirm('associate')}
                      >
                        Associate record
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={demoState === 'offline' || selected.status === 'Closed'}
                        onClick={() => setConfirm('escalate')}
                      >
                        Escalate
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={demoState === 'offline' || selected.status === 'Closed'}
                        onClick={() => setConfirm('close')}
                      >
                        Close after review
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={demoState === 'offline'}
                      onClick={() => setConfirm('escalate')}
                    >
                      Escalate to T&S
                    </Button>
                  )}
                </div>
                {canEnforce && mod ? (
                  <Button type="button" className="mt-2.5 w-full" disabled={demoState === 'offline'} asChild>
                    <Link to={mod.to}>
                      {mod.act} — open {selected.target}
                    </Link>
                  </Button>
                ) : null}
                <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                  Enforcement lives in the object’s own module. Closing a report does not hide a listing or suspend a
                  user by itself.
                </p>
              </div>
            </>
          )}
        </aside>
      </div>

      {confirm === 'close' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={`Close ${selected.id} after review?`}
          description="Closing records the outcome on this report. It does not change listing, user or Live enforcement state by itself."
          confirmLabel="Close report"
          reasonLabel="Outcome & reason (required)"
          reasonPlaceholder="No policy breach found — listing description matched the photographs."
          metaRows={[
            { label: 'Affected object', value: `${selected.target} · ${selected.objectTitle}` },
            { label: 'AI assistance', value: selected.aiUnavailable ? 'Unavailable · manual review' : 'Signal reviewed by admin' },
            { label: 'Audit entry', value: 'Created on confirm' },
          ]}
          onConfirm={(reason) => {
            const stamp = stampNow();
            const by = actorLabel();
            patchReport(selected.id, {
              status: 'Closed',
              flash: `${selected.id} closed · ${by} · ${stamp}`,
              history: appendHistory(selected, {
                id: `cl-${Date.now()}`,
                at: stamp,
                title: 'Closed after human review',
                detail: `${by} · ${reason}`,
                tone: 'ok',
              }),
            });
            show(`Closed ${selected.id}`);
            setConfirm(null);
          }}
        />
      ) : null}

      {confirm === 'escalate' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={isSupport ? 'Escalate to Trust & Safety' : `Escalate ${selected.id}?`}
          description={
            isSupport
              ? `Route ${selected.id} to Trust & Safety for enforcement review.`
              : `Raise priority on ${selected.id} / ${selected.target}.`
          }
          confirmLabel="Escalate"
          reasonLabel="Escalation reason"
          reasonPlaceholder="Why this needs elevated review…"
          onConfirm={(reason) => {
            const stamp = stampNow();
            const by = actorLabel();
            patchReport(selected.id, {
              status: 'Escalated',
              flash: `${selected.id} escalated`,
              history: appendHistory(selected, {
                id: `es-${Date.now()}`,
                at: stamp,
                title: isSupport ? 'Escalated to Trust & Safety' : 'Escalated',
                detail: `${by} · ${reason}`,
                tone: 'warn',
              }),
            });
            show(isSupport ? 'Escalated to T&S' : `Escalated ${selected.id}`);
            setConfirm(null);
          }}
        />
      ) : null}

      {confirm === 'associate' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={`Associate a record with ${selected.id}?`}
          description="Link another report, order or user record to this case. Sellers and buyers never see this association."
          confirmLabel="Associate"
          reasonLabel="Record reference + note"
          reasonPlaceholder="RPT-#### or ORD-#### · why it belongs on this case…"
          onConfirm={(reason) => {
            const stamp = stampNow();
            const by = actorLabel();
            patchReport(selected.id, {
              history: appendHistory(selected, {
                id: `as-${Date.now()}`,
                at: stamp,
                title: 'Record associated',
                detail: `${by} · ${reason}`,
              }),
              flash: 'Association recorded',
            });
            show('Record associated');
            setConfirm(null);
          }}
        />
      ) : null}

      {confirm === 'note' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title="Add internal note"
          description={`Note stays on ${selected.id}. Sellers and buyers never see this.`}
          confirmLabel="Save note"
          reasonLabel="Internal note"
          reasonPlaceholder="Context for the next reviewer…"
          defaultReason={noteDraft}
          onConfirm={(reason) => {
            const stamp = stampNow();
            const by = actorLabel();
            patchReport(selected.id, {
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
