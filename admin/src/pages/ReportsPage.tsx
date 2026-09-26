import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, roleLabel } from '@/auth/AuthContext';
import { useBleedSelection } from '@/hooks/use-bleed-selection';
import {
  actionTakenAdminReport,
  assignAdminReport,
  associateAdminReport,
  closeAdminReport,
  dismissAdminReport,
  escalateAdminReport,
  fetchAdminReport,
  fetchAdminReports,
  noteAdminReport,
  type AdminReportCounts,
  type AdminReportDto,
} from '@/api/reports';
import { AiAdvisory } from '@/components/admin/ai-advisory';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { ExpandableListHeader, ExpandableListRow } from '@/components/admin/expandable-list-row';
import { FilterChips } from '@/components/admin/filter-chips';
import { CopyableId } from '@/components/admin/copyable-id';
import { ListWindowFooter } from '@/components/admin/list-window-footer';
import { StatusBadge, type StatusTone } from '@/components/admin/status-badge';
import { Timeline } from '@/components/admin/timeline';
import { BleedSplit } from '@/components/layout/bleed-split';
import { usePageChrome } from '@/components/layout/shell-chrome';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useListWindow } from '@/hooks/use-list-window';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { canAct, ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

type QueueFilter =
  | 'open'
  | 'high'
  | 'repeat'
  | 'escalated'
  | 'action_taken'
  | 'closed'
  | 'assigned_me';
type ConfirmKind = 'close' | 'escalate' | 'associate' | 'note' | 'assign' | 'dismiss' | 'action_taken' | null;

type ReportOverride = {
  status?: AdminReportDto['status'];
  history?: AdminReportDto['history'];
  flash?: string | null;
  assigned?: string;
};

const emptyCounts: AdminReportCounts = {
  all: 0,
  open: 0,
  high: 0,
  repeat: 0,
  escalated: 0,
  action_taken: 0,
  closed: 0,
  assigned_me: 0,
};

function statusTone(s: AdminReportDto['status']): StatusTone {
  if (s === 'New') return 'hold';
  if (s === 'Under review') return 'neutral';
  if (s === 'Escalated') return 'plum';
  if (s === 'Action taken') return 'clear';
  if (s === 'Closed') return 'neutral';
  return 'neutral';
}

function aiTone(p: AdminReportDto['aiPriority']): StatusTone {
  if (p === 'High') return 'risk';
  if (p === 'Medium') return 'hold';
  return 'neutral';
}

function moduleFor(route: AdminReportDto['route']) {
  if (route === 'Listing') return { to: '/listings', label: 'Listings', act: 'Act in Listings' };
  if (route === 'User') return { to: '/users', label: 'Users', act: 'Act in Users' };
  return { to: '/live', label: 'Live', act: 'Act in Live' };
}

function isOpenStatus(s: AdminReportDto['status']) {
  return s === 'New' || s === 'Under review';
}

export function ReportsPage() {
  const { session } = useAuth();
  const liveMode = Boolean(session?.accessToken);
  const { banner, show } = useToast();
  const [queue, setQueue] = useState<QueueFilter>('open');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useBleedSelection(null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [overrides, setOverrides] = useState<Record<string, ReportOverride>>({});
  const [noteDraft, setNoteDraft] = useState('');
  const [loading, setLoading] = useState(liveMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [liveReports, setLiveReports] = useState<AdminReportDto[]>([]);
  const [liveCounts, setLiveCounts] = useState<AdminReportCounts>(emptyCounts);
  const [flashById, setFlashById] = useState<Record<string, string>>({});

  const isSupport = session?.role === 'support';
  const canEnforce = session?.role === 'super_admin' || session?.role === 'trust_safety';
  const canClose = session?.role ? canAct(session.role, 'close_report') : false;
  const canDismiss = session?.role ? canAct(session.role, 'dismiss_report') : false;
  const canActionTaken = session?.role ? canAct(session.role, 'mark_report_action_taken') : false;

  const loadLive = useCallback(async () => {
    if (!liveMode) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAdminReports(queue, search);
      setLiveReports(data.reports);
      setLiveCounts(data.counts);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load reports');
    } finally {
      setLoading(false);
    }
  }, [liveMode, queue, search]);

  const applyDetail = useCallback((detail: { report: AdminReportDto }) => {
    setLiveReports((current) => {
      const idx = current.findIndex((r) => r.id === detail.report.id);
      if (idx === -1) return [detail.report, ...current];
      const next = [...current];
      next[idx] = detail.report;
      return next;
    });
  }, []);

  const loadSelectedDetail = useCallback(
    async (id: string) => {
      if (!liveMode) return;
      try {
        const detail = await fetchAdminReport(id);
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
      setLiveReports([]);
      return;
    }
    void loadLive();
  }, [liveMode, loadLive]);

  useEffect(() => {
    if (!liveMode || !selectedId) return;
    void loadSelectedDetail(selectedId);
  }, [liveMode, selectedId, loadSelectedDetail]);

  useEffect(() => {
    if (!liveMode || selectedId) return;
    if (liveReports[0]) setSelectedId(liveReports[0].id);
  }, [liveMode, liveReports, selectedId, setSelectedId]);

  const reports: AdminReportDto[] = useMemo(
    () =>
      liveReports.map((r) => {
        const o = overrides[r.id];
        if (!o) return r;
        return {
          ...r,
          status: o.status ?? r.status,
          history: o.history ?? r.history,
          assigned: o.assigned ?? r.assigned,
        };
      }),
    [liveReports, overrides],
  );

  const awaiting = liveMode
    ? liveCounts.open
    : reports.filter((r) => isOpenStatus(r.status)).length;
  const linked = liveMode
    ? liveCounts.repeat
    : reports.filter((r) => r.linkedReports.length > 0).length;
  const assignedToMeCount = liveMode
    ? liveCounts.assigned_me
    : reports.filter((r) => r.assignedToMe || r.assigned === session?.name).length;

  usePageChrome({
    title: 'Reports',
    subtitle: liveMode
      ? `${awaiting} awaiting review · ${linked} linked · routes: user · listing · Live · Live comment`
      : `${awaiting} awaiting review · ${linked} linked · routes: user · listing · Live · Live comment`,
    search,
    onSearchChange: setSearch,
    searchPlaceholder: 'Report, object or username',
    bleed: true,
  });

  const rows = useMemo(() => {
    if (liveMode) {
      // Server already filtered by queue; light client search for snappy typing
      const q = search.trim().toLowerCase();
      if (!q) return reports;
      return reports.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q) ||
          r.target.toLowerCase().includes(q) ||
          r.objectTitle.toLowerCase().includes(q) ||
          r.objectMeta.toLowerCase().includes(q) ||
          r.reporter.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q),
      );
    }
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (queue === 'open' && !isOpenStatus(r.status)) return false;
      if (queue === 'high' && r.aiPriority !== 'High' && !(r.status === 'Escalated' || r.linkedReports.length >= 2)) {
        return false;
      }
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
  }, [reports, queue, search, session?.name, liveMode]);

  const listWindow = useListWindow(rows);

  const selected = reports.find((r) => r.id === selectedId) ?? null;
  const selectedFlash = selected
    ? liveMode
      ? flashById[selected.id]
      : overrides[selected.id]?.flash
    : null;
  const mod = selected ? moduleFor(selected.route) : null;

  function patchReport(id: string, next: ReportOverride) {
    setOverrides((current) => ({
      ...current,
      [id]: { ...current[id], ...next },
    }));
  }

  function appendHistory(report: AdminReportDto, entry: AdminReportDto['history'][number]): AdminReportDto['history'] {
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

  async function runLiveAction(kind: ConfirmKind, reason: string) {
    if (!selected || !kind || !liveMode) return;
    setActionBusy(true);
    try {
      let detail: { report: AdminReportDto };
      if (kind === 'note') detail = await noteAdminReport(selected.id, reason);
      else if (kind === 'escalate') detail = await escalateAdminReport(selected.id, reason);
      else if (kind === 'assign') detail = await assignAdminReport(selected.id, reason);
      else if (kind === 'close') detail = await closeAdminReport(selected.id, reason);
      else if (kind === 'dismiss') detail = await dismissAdminReport(selected.id, reason);
      else if (kind === 'action_taken') detail = await actionTakenAdminReport(selected.id, reason);
      else if (kind === 'associate') detail = await associateAdminReport(selected.id, reason);
      else return;

      applyDetail(detail);
      setFlashById((c) => ({ ...c, [selected.id]: `${selected.id} updated` }));
      show(`Updated ${selected.id}`);
      setConfirm(null);
      await loadLive();
      await loadSelectedDetail(selected.id);
    } catch (err) {
      show(err instanceof Error ? err.message : 'Action failed');
      setConfirm(null);
    } finally {
      setActionBusy(false);
    }
  }

  const reportDesktopCols =
    'grid-cols-[88px_92px_minmax(0,1.35fr)_minmax(0,1fr)_52px_100px_108px] items-center py-3';

  const chipCounts = liveMode
    ? {
        open: liveCounts.open,
        high: liveCounts.high,
        repeat: liveCounts.repeat,
        escalated: liveCounts.escalated,
        action_taken: liveCounts.action_taken,
        closed: liveCounts.closed,
      }
    : {
        open: awaiting,
        high: undefined as number | undefined,
        repeat: undefined as number | undefined,
        escalated: undefined as number | undefined,
        action_taken: undefined as number | undefined,
        closed: undefined as number | undefined,
      };
  return (
    <>
      <BleedSplit
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        gridClassName="grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.95fr)]"
        inspectorTitle="Report"
        list={
          <>
            <div className="space-y-3 border-b border-[#e7dcd2] px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <FilterChips
                  value={queue}
                  onChange={(id) => setQueue(id as QueueFilter)}
                  options={[
                    { id: 'open', label: 'New & under review', count: chipCounts.open },
                    { id: 'high', label: 'High priority', count: chipCounts.high },
                    { id: 'repeat', label: 'Repeat reports', count: chipCounts.repeat },
                    { id: 'escalated', label: 'Escalated', count: chipCounts.escalated },
                    { id: 'action_taken', label: 'Action taken', count: chipCounts.action_taken },
                    { id: 'closed', label: 'Closed', count: chipCounts.closed },
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
              {liveMode && loadError ? (
                <Alert className="mt-3 rounded-[5px] border-risk-border bg-risk-bg">
                  <AlertTitle className="text-[12px] text-risk">Could not load</AlertTitle>
                  <AlertDescription className="text-[11.5px] text-risk">{loadError}</AlertDescription>
                </Alert>
              ) : null}
              {loading ? (
                <p className="mt-2 text-[11.5px] text-body">Loading reports…</p>
              ) : null}
            </div>

            <div ref={listWindow.scrollRef} className="min-h-0 flex-1 overflow-auto">
              {rows.length === 0 ? (
                <EmptyState
                  title="No open reports"
                  description="Nothing awaiting review in this filter."
                  actionLabel="Reset filters"
                  onAction={() => {
                    setQueue('open');
                    setSearch('');
                  }}
                />
              ) : null}

              {rows.length > 0 ? (
                <>
                  <ExpandableListHeader
                    desktopClassName={reportDesktopCols}
                    columns={
                      <>
                        <span>Report</span>
                        <span>Type</span>
                        <span>Reported object</span>
                        <span>Category</span>
                        <span>Age</span>
                        <span>AI priority</span>
                        <span>Status</span>
                      </>
                    }
                  />
                  {listWindow.visible.map((r) => {
                    const active = r.id === selectedId;
                    return (
                      <ExpandableListRow
                        key={r.id}
                        selected={active}
                        onSelect={() => setSelectedId(r.id)}
                        desktopClassName={reportDesktopCols}
                        primary={
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] font-semibold text-plum">{r.id}</span>
                              <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                            </div>
                            <div className="mt-1 truncate text-[12.5px] font-semibold text-espresso">
                              {r.objectTitle}
                            </div>
                            <div className="mt-0.5 truncate text-[11px] text-body">
                              {r.target} · {r.objectMeta}
                            </div>
                          </div>
                        }
                        details={[
                          { label: 'Type', value: r.route },
                          { label: 'Category', value: r.category },
                          { label: 'Age', value: r.ageLabel },
                          {
                            label: 'AI priority',
                            value: <StatusBadge tone={aiTone(r.aiPriority)}>AI · {r.aiPriority}</StatusBadge>,
                          },
                        ]}
                      >
                        <span className="font-mono text-[11px] font-semibold text-plum">{r.id}</span>
                        <span className="truncate text-[11.5px] text-body">{r.route}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-semibold text-espresso">
                            {r.objectTitle}
                          </span>
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
                      </ExpandableListRow>
                    );
                  })}
                  <ListWindowFooter {...listWindow} />
                  <p className="px-4 py-3 text-[11px] leading-relaxed text-body">
                    Categories stay deliberately broad. Throve’s full policy taxonomy is not settled in this hi-fi.
                  </p>
                </>
              ) : null}
            </div>
          </>
        }
        inspector={
          !selected ? (
            <div className="flex flex-1 items-center justify-center px-6 text-[12.5px] text-body">
              Select a report to inspect.
            </div>
          ) : (
            <>
              <div className="border-b border-[#e7dcd2] px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CopyableId value={selected.id} variant="mono" />
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
                    disabled={actionBusy || selected.status === 'Closed'}
                    onClick={() => setConfirm('assign')}
                  >
                    Assign to me
                  </Button>
                  {canEnforce ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={actionBusy}
                        onClick={() => setConfirm('associate')}
                      >
                        Associate record
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={actionBusy || selected.status === 'Closed'}
                        onClick={() => setConfirm('escalate')}
                      >
                        Escalate
                      </Button>
                      {canActionTaken ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={actionBusy || selected.status === 'Action taken' || selected.status === 'Closed'}
                          onClick={() => setConfirm('action_taken')}
                        >
                          Mark action taken
                        </Button>
                      ) : null}
                      {canDismiss ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={actionBusy || selected.status === 'Closed'}
                          onClick={() => setConfirm('dismiss')}
                        >
                          Dismiss
                        </Button>
                      ) : null}
                      {canClose ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={actionBusy || selected.status === 'Closed'}
                          onClick={() => setConfirm('close')}
                        >
                          Close after review
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={actionBusy}
                      onClick={() => setConfirm('escalate')}
                    >
                      Escalate to T&S
                    </Button>
                  )}
                </div>
                {canEnforce && mod ? (
                  <Button type="button" className="mt-2.5 w-full" asChild>
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
          )
        }
      />

      {confirm === 'close' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title={`Close ${selected.id} after review?`}
          description="Closing records the outcome on this report. It does not change listing, user or Live enforcement state by itself."
          confirmLabel={actionBusy ? 'Working…' : 'Close report'}
          reasonLabel="Outcome & reason (required)"
          reasonPlaceholder="No policy breach found — listing description matched the photographs."
          metaRows={[
            { label: 'Affected object', value: `${selected.target} · ${selected.objectTitle}` },
            { label: 'AI assistance', value: selected.aiUnavailable ? 'Unavailable · manual review' : 'Signal reviewed by admin' },
            { label: 'Audit entry', value: 'Created on confirm' },
          ]}
          onConfirm={(reason) => {
            if (liveMode) {
              void runLiveAction('close', reason);
              return;
            }
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

      {confirm === 'dismiss' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title={`Dismiss ${selected.id}?`}
          description="Dismiss when the report is not actionable. Same closed queue as close."
          confirmLabel={actionBusy ? 'Working…' : 'Dismiss report'}
          reasonLabel="Dismissal reason"
          reasonPlaceholder="Why this report is being dismissed…"
          onConfirm={(reason) => {
            if (liveMode) {
              void runLiveAction('dismiss', reason);
              return;
            }
            const stamp = stampNow();
            const by = actorLabel();
            patchReport(selected.id, {
              status: 'Closed',
              flash: `${selected.id} dismissed`,
              history: appendHistory(selected, {
                id: `di-${Date.now()}`,
                at: stamp,
                title: 'Dismissed',
                detail: `${by} · ${reason}`,
                tone: 'ok',
              }),
            });
            show(`Dismissed ${selected.id}`);
            setConfirm(null);
          }}
        />
      ) : null}

      {confirm === 'action_taken' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title={`Mark action taken on ${selected.id}?`}
          description="Records that enforcement was completed in Users, Listings, or Live."
          confirmLabel={actionBusy ? 'Working…' : 'Mark action taken'}
          reasonLabel="What action was taken"
          reasonPlaceholder="Suspended seller · hid listing · ended live…"
          onConfirm={(reason) => {
            if (liveMode) {
              void runLiveAction('action_taken', reason);
              return;
            }
            const stamp = stampNow();
            const by = actorLabel();
            patchReport(selected.id, {
              status: 'Action taken',
              flash: `${selected.id} action taken`,
              history: appendHistory(selected, {
                id: `at-${Date.now()}`,
                at: stamp,
                title: 'Action taken',
                detail: `${by} · ${reason}`,
                tone: 'ok',
              }),
            });
            show(`Action taken · ${selected.id}`);
            setConfirm(null);
          }}
        />
      ) : null}

      {confirm === 'assign' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title={`Assign ${selected.id} to you?`}
          description="Self-assign moves New reports into Under review."
          confirmLabel={actionBusy ? 'Working…' : 'Assign to me'}
          reasonLabel="Note (optional context)"
          reasonPlaceholder="Picking this up for triage…"
          reasonOptional
          onConfirm={(reason) => {
            if (liveMode) {
              void runLiveAction('assign', reason || 'Self-assigned');
              return;
            }
            const stamp = stampNow();
            const by = actorLabel();
            patchReport(selected.id, {
              status: selected.status === 'New' ? 'Under review' : selected.status,
              assigned: session?.name ?? 'Me',
              flash: `${selected.id} assigned`,
              history: appendHistory(selected, {
                id: `asg-${Date.now()}`,
                at: stamp,
                title: 'Assigned',
                detail: `${by} · ${reason || 'Self-assigned'}`,
              }),
            });
            show(`Assigned ${selected.id}`);
            setConfirm(null);
          }}
        />
      ) : null}

      {confirm === 'escalate' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title={isSupport ? 'Escalate to Trust & Safety' : `Escalate ${selected.id}?`}
          description={
            isSupport
              ? `Route ${selected.id} to Trust & Safety for enforcement review.`
              : `Raise priority on ${selected.id} / ${selected.target}.`
          }
          confirmLabel={actionBusy ? 'Working…' : 'Escalate'}
          reasonLabel="Escalation reason"
          reasonPlaceholder="Why this needs elevated review…"
          onConfirm={(reason) => {
            if (liveMode) {
              void runLiveAction('escalate', reason);
              return;
            }
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
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title={`Associate a record with ${selected.id}?`}
          description="Link another report, order or user record to this case. Sellers and buyers never see this association."
          confirmLabel={actionBusy ? 'Working…' : 'Associate'}
          reasonLabel="Record reference + note"
          reasonPlaceholder="RPT-#### or ORD-#### · why it belongs on this case…"
          onConfirm={(reason) => {
            if (liveMode) {
              void runLiveAction('associate', reason);
              return;
            }
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
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title="Add internal note"
          description={`Note stays on ${selected.id}. Sellers and buyers never see this.`}
          confirmLabel={actionBusy ? 'Working…' : 'Save note'}
          reasonLabel="Internal note"
          reasonPlaceholder="Context for the next reviewer…"
          defaultReason={noteDraft}
          onConfirm={(reason) => {
            if (liveMode) {
              void runLiveAction('note', reason);
              return;
            }
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
