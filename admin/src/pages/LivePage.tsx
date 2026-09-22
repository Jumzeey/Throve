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
import { formatNaira, mockLive, type MockLive } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { canAct } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

type DemoState = 'ready' | 'loading' | 'empty' | 'error' | 'offline';
type QueueFilter = 'live' | 'upcoming' | 'ended' | 'incidents';
type ConfirmKind = 'end' | 'note' | 'escalate' | null;

type LiveOverride = {
  status?: MockLive['status'];
  timeline?: MockLive['timeline'];
  flash?: string | null;
  endedByPlatform?: boolean;
};

function statusTone(s: MockLive['status']): StatusTone {
  if (s === 'Live') return 'risk';
  if (s === 'Upcoming') return 'hold';
  if (s === 'Incident') return 'risk';
  return 'neutral';
}

function aiTone(p: MockLive['aiPriority']): StatusTone {
  if (p === 'High') return 'risk';
  if (p === 'Medium') return 'plum';
  return 'neutral';
}

function hasIncidents(s: MockLive) {
  return s.reports > 0 || s.linkedIncidents.length > 0 || s.status === 'Incident';
}

function isActiveLive(s: MockLive) {
  return s.status === 'Live';
}

function listTime(s: MockLive) {
  return s.timeLabel ?? s.startedAt;
}

export function LivePage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [queue, setQueue] = useState<QueueFilter>('live');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(mockLive[0]?.id ?? null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [demoState, setDemoState] = useState<DemoState>('ready');
  const [overrides, setOverrides] = useState<Record<string, LiveOverride>>({});
  const [noteDraft, setNoteDraft] = useState('');

  const canEnd = session ? canAct(session.role, 'end_live') : false;
  const isSupport = session?.role === 'support';
  const isFinance = session?.role === 'finance';
  const canPlatformAct = canEnd && !isSupport && !isFinance;

  const sessions = useMemo(
    () =>
      mockLive.map((s) => {
        const o = overrides[s.id];
        if (!o) return s;
        return {
          ...s,
          status: o.status ?? s.status,
          timeline: o.timeline ?? s.timeline,
        };
      }),
    [overrides],
  );

  const liveCount = sessions.filter(isActiveLive).length;
  const upcomingCount = sessions.filter((s) => s.status === 'Upcoming').length;
  const incidentCount = sessions.filter(hasIncidents).length;

  usePageChrome({
    title: 'Live',
    subtitle: `${liveCount} live now · ${upcomingCount} upcoming · ${incidentCount} incidents open · hosting is approved-seller only`,
    search,
    onSearchChange: setSearch,
    searchPlaceholder: 'Session, host or report',
    bleed: true,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      if (queue === 'live' && !isActiveLive(s)) return false;
      if (queue === 'upcoming' && s.status !== 'Upcoming') return false;
      if (queue === 'ended' && s.status !== 'Ended' && s.status !== 'Incident') return false;
      if (queue === 'incidents' && !hasIncidents(s)) return false;
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.host.toLowerCase().includes(q) ||
        s.linkedIncidents.some((i) => i.id.toLowerCase().includes(q) || (i.target ?? '').toLowerCase().includes(q))
      );
    });
  }, [sessions, queue, search]);

  const selected = sessions.find((s) => s.id === selectedId) ?? null;
  const selectedFlash = selected ? overrides[selected.id]?.flash : null;
  const selectedEndedByPlatform = selected ? Boolean(overrides[selected.id]?.endedByPlatform) : false;
  const alreadyEnded =
    selected?.status === 'Ended' || selected?.status === 'Incident' || selectedEndedByPlatform;
  const primaryViewer =
    selected?.flaggedComments[0]?.user ?? selected?.linkedIncidents[0]?.target ?? selected?.host;

  function patchSession(id: string, next: LiveOverride) {
    setOverrides((current) => ({
      ...current,
      [id]: { ...current[id], ...next },
    }));
  }

  function appendTimeline(session: MockLive, entry: MockLive['timeline'][number]): MockLive['timeline'] {
    return [entry, ...(overrides[session.id]?.timeline ?? session.timeline)];
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
      <div className="grid h-full min-h-0 grid-cols-[minmax(320px,0.95fr)_minmax(0,1.45fr)]">
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
                { id: 'empty', label: 'No lives' },
                { id: 'error', label: 'Error' },
                { id: 'offline', label: 'Offline' },
              ]}
            />
            <FilterChips
              value={queue}
              onChange={(id) => setQueue(id as QueueFilter)}
              options={[
                { id: 'live', label: 'Live now', count: liveCount },
                { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
                { id: 'ended', label: 'Ended' },
                { id: 'incidents', label: 'With incidents', count: incidentCount },
              ]}
            />
            {banner}
            {demoState === 'offline' ? <OfflineBanner onRetry={() => setDemoState('ready')} /> : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {demoState === 'loading' ? <LoadingState label="Loading sessions…" /> : null}

            {demoState === 'error' ? (
              <ErrorState
                title="Session could not load"
                description="Nothing was changed. Retry when the connection is stable."
                onRetry={() => setDemoState('ready')}
              />
            ) : null}

            {demoState === 'empty' || (demoState === 'ready' && rows.length === 0) ? (
              <EmptyState
                title={queue === 'live' ? 'Nothing live right now' : 'No sessions match'}
                description={
                  queue === 'live'
                    ? `${upcomingCount} session${upcomingCount === 1 ? '' : 's'} scheduled for later.`
                    : 'Try a different filter or search.'
                }
                actionLabel="Reset filters"
                onAction={() => {
                  setQueue('live');
                  setSearch('');
                  setDemoState('ready');
                }}
              />
            ) : null}

            {(demoState === 'ready' || demoState === 'offline') && rows.length > 0 ? (
              <div className="flex flex-col">
                {rows.map((s) => {
                  const active = s.id === selectedId;
                  const live = isActiveLive(s);
                  const incidentCount = s.reports || s.linkedIncidents.length;
                  const modsLabel =
                    s.appointedMods.length === 0
                      ? 'no appointed moderator'
                      : `${s.appointedMods.length} appointed moderator${s.appointedMods.length === 1 ? '' : 's'}`;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={demoState === 'offline'}
                      onClick={() => setSelectedId(s.id)}
                      className={cn(
                        'border-b border-[#f0e7de] px-4 py-4 text-left last:border-0',
                        active ? 'bg-[#f9f1ea]' : 'bg-panel hover:bg-[#fbf5ef]',
                        demoState === 'offline' && 'opacity-60',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          {live ? <span className="size-2 shrink-0 rounded-full bg-risk" aria-hidden /> : null}
                          <span className="font-display text-[17px] leading-none text-espresso">{s.id}</span>
                          {!live ? <StatusBadge tone={statusTone(s.status)}>{s.status}</StatusBadge> : null}
                        </div>
                        <span className="shrink-0 pt-0.5 text-[11.5px] tabular-nums text-body">{listTime(s)}</span>
                      </div>

                      <div className="mt-2.5 text-[13.5px] leading-snug text-espresso">
                        <span className="font-semibold">{s.title}</span>
                        <span className="text-body"> · host @{s.host}</span>
                      </div>

                      <div className="mt-1.5 text-[12px] text-body">
                        {live || s.status === 'Ended' || s.status === 'Incident' ? (
                          <>
                            {s.viewers > 0 ? `${s.viewers} viewers · ` : null}
                            {modsLabel} · {s.productCount} product{s.productCount === 1 ? '' : 's'} selected
                          </>
                        ) : (
                          <>
                            Upcoming · {modsLabel}
                            {s.productCount > 0
                              ? ` · ${s.productCount} product${s.productCount === 1 ? '' : 's'} selected`
                              : null}
                          </>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {hasIncidents(s) ? (
                          <StatusBadge tone="risk">
                            {incidentCount} incident{incidentCount === 1 ? '' : 's'} reported
                          </StatusBadge>
                        ) : live || s.status === 'Ended' ? (
                          <StatusBadge tone="neutral">No incidents</StatusBadge>
                        ) : null}
                        {s.aiPriority === 'High' || s.aiPriority === 'Medium' ? (
                          <StatusBadge tone={aiTone(s.aiPriority)}>AI · {s.aiPriority}</StatusBadge>
                        ) : null}
                        {s.hostApproved ? (
                          <StatusBadge tone="clear">Host approved</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">Host not approved</StatusBadge>
                        )}
                        {s.actionTaken && !live ? <StatusBadge tone="clear">Action taken</StatusBadge> : null}
                        {s.connectionIssue ? <StatusBadge tone="hold">Connection issue</StatusBadge> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col bg-panel">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center px-6 text-[12.5px] text-body">
              Select a session to inspect.
            </div>
          ) : demoState === 'error' ? (
            <div className="flex flex-1 flex-col justify-center gap-3 px-5">
              <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                <AlertTitle className="text-[12px] text-risk">Session could not load · nothing was changed</AlertTitle>
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
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-[28px] leading-none text-espresso">{selected.id}</h2>
                      {isActiveLive(selected) ? (
                        <span className="inline-flex items-center rounded-[3px] bg-risk px-[7px] py-[3px] text-[10.5px] font-semibold text-white">
                          Live now
                        </span>
                      ) : (
                        <StatusBadge tone={statusTone(selected.status)}>{selected.status}</StatusBadge>
                      )}
                      {hasIncidents(selected) ? (
                        <StatusBadge tone="risk">Incident reported</StatusBadge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[13px] leading-snug text-body">
                      {selected.title} · host @{selected.host}
                      {selected.hostApproved ? ' (approved host)' : ' (not approved)'} ·{' '}
                      {isActiveLive(selected)
                        ? `started ${selected.startedAt}`
                        : selected.status === 'Upcoming'
                          ? `scheduled ${selected.scheduledAt ?? selected.startedAt}`
                          : listTime(selected)}
                    </p>
                  </div>
                  {selected.viewers > 0 || isActiveLive(selected) ? (
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] font-semibold tracking-[0.14em] text-muted-2 uppercase">
                        Viewers
                      </div>
                      <div className="font-display text-[32px] leading-none tabular-nums text-espresso">
                        {selected.viewers}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <div className="grid min-h-full grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
                  <div className="space-y-5 border-r-0 px-5 py-4 lg:border-r lg:border-[#e7dcd2]">
                    {selectedFlash ? (
                      <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                        <AlertTitle className="text-[12px] text-clear">Session ended by Trust & Safety</AlertTitle>
                        <AlertDescription className="text-[11.5px] text-clear">{selectedFlash}</AlertDescription>
                      </Alert>
                    ) : null}

                    {selected.reports >= 3 ? (
                      <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                        <AlertTitle className="text-[12px] text-risk">
                          {selected.reports} reports in one session
                        </AlertTitle>
                        <AlertDescription className="text-[11.5px] text-risk">
                          Review before considering platform action.
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {isActiveLive(selected) && selected.appointedMods.length === 0 ? (
                      <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                        <AlertTitle className="text-[12px] text-[#8a5a15]">Host is moderating alone</AlertTitle>
                        <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                          0 of a maximum 2 appointed moderators. Useful context when judging response time.
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {!selected.hostApproved ? (
                      <Alert className="rounded-[5px] border-border-soft bg-[#f3ede6]">
                        <AlertTitle className="text-[12px] text-espresso">Cannot host Live</AlertTitle>
                        <AlertDescription className="text-[11.5px] text-body">
                          Hosting stays limited to approved sellers. Approval is administrator-controlled.
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {alreadyEnded && !selectedFlash ? (
                      <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                        <AlertTitle className="text-[12px] text-[#8a5a15]">Session ended by the host</AlertTitle>
                        <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                          End Live is no longer valid — the session is no longer active.
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    <div className="flex aspect-[16/9] flex-col items-center justify-center rounded-[6px] bg-[#3a3a3a] px-6 text-center">
                      <div className="text-[13px] font-semibold tracking-[0.08em] text-[#d8d8d8] uppercase">
                        Session video placeholder
                      </div>
                      <div className="mt-2 text-[11.5px] text-[#b0b0b0]">
                        {selected.id} · read-only review · admins do not broadcast
                      </div>
                    </div>

                    {selected.aiSummary ? (
                      <AiAdvisory
                        kind="INCIDENT SUMMARY"
                        recommendation={
                          selected.aiNextStep ? (
                            <>Recommended next step: {selected.aiNextStep}.</>
                          ) : undefined
                        }
                      >
                        {selected.aiSummary}
                      </AiAdvisory>
                    ) : null}

                    <div>
                      <div className="mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-espresso">
                        Flagged comments
                      </div>
                      {selected.flaggedComments.length === 0 ? (
                        <p className="text-[12px] text-body">No flagged comments.</p>
                      ) : isSupport && selected.evidenceRestricted ? (
                        <Alert className="rounded-[5px] border-dashed border-plum-border bg-plum-soft">
                          <Lock className="size-3.5 text-plum" />
                          <AlertTitle className="text-[11px] font-semibold text-plum">Evidence Restricted</AlertTitle>
                          <AlertDescription className="text-[11px] text-body">
                            Comment evidence is Restricted for Customer Support. Escalate to Trust & Safety.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <ul className="divide-y divide-[#f0e7de] border-t border-[#e7dcd2]">
                          {selected.flaggedComments.map((c) => (
                            <li key={c.id} className="flex items-start justify-between gap-3 py-3">
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-espresso">@{c.user}</div>
                                <div className="mt-0.5 text-[12px] text-body">
                                  {c.action ?? c.reason}
                                </div>
                              </div>
                              {c.at ? (
                                <span className="shrink-0 text-[11px] tabular-nums text-body">{c.at}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-4 py-4">
                      <div className="mb-3 text-[13px] font-semibold text-espresso">Pinned products</div>
                      {selected.pinnedProducts.length === 0 ? (
                        <p className="text-[12px] text-body">No products pinned.</p>
                      ) : (
                        <div className="flex gap-4 overflow-x-auto pb-1">
                          {selected.pinnedProducts.map((p) => (
                            <div key={p.id} className="w-[112px] shrink-0">
                              <div className="mb-2 aspect-square rounded-[4px] bg-[#d9d3cd]" />
                              <div className="truncate text-[12px] leading-snug text-espresso">
                                {p.title} · {formatNaira(p.price)}
                              </div>
                              <div
                                className={cn(
                                  'mt-1 text-[12px] font-medium',
                                  p.status === 'Available' && 'text-clear',
                                  p.status === 'Reserved' && 'text-hold',
                                  p.status === 'Sold' && 'text-body',
                                )}
                              >
                                {p.status}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="mt-3 text-[11px] leading-relaxed text-body">
                        Product, claim, checkout and order states are marketplace transaction states. Admin
                        moderation does not change price, claims or Sold state, and buyer payment and delivery
                        details are not exposed here.
                      </p>
                    </div>

                    <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-4 py-4">
                      <div className="mb-3 text-[13px] font-semibold text-espresso">
                        Session & internal action history
                      </div>
                      {selected.timeline.length === 0 ? (
                        <p className="text-[12px] text-body">No events yet.</p>
                      ) : (
                        <ul className="divide-y divide-[#ebe3da]">
                          {selected.timeline.map((event) => (
                            <li key={event.id} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 py-2.5 first:pt-0 last:pb-0">
                              <span className="pt-0.5 text-[12px] tabular-nums text-body">{event.at}</span>
                              <span className="text-[12.5px] leading-snug text-espresso">
                                {event.title}
                                {event.detail ? ` · ${event.detail}` : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col bg-[#fbf8f5]">
                    <div className="flex-1 space-y-5 px-5 py-4">
                      <div>
                        <div className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-espresso">
                          Who is who in this session
                        </div>
                        <ul className="space-y-4">
                          <li>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-semibold text-espresso">@{selected.host}</span>
                              <StatusBadge tone="plum">Live host</StatusBadge>
                            </div>
                            <p className="mt-1 text-[11.5px] leading-snug text-body">
                              {selected.hostApproved ? 'Approved host' : 'Not approved'} · broadcasts, selects and
                              pins products
                            </p>
                          </li>
                          {selected.appointedMods.map((m, index) => (
                            <li key={m}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[13px] font-semibold text-espresso">@{m}</span>
                                <StatusBadge tone="gold">Appointed moderator</StatusBadge>
                              </div>
                              <p className="mt-1 text-[11.5px] leading-snug text-body">
                                {index === 0
                                  ? 'Seller-appointed · may remove and pin comments, mute or remove viewers, escalate'
                                  : 'Second of a maximum of two appointed moderators'}
                              </p>
                            </li>
                          ))}
                          {selected.appointedMods.length === 0 ? (
                            <li className="text-[12px] text-body">No appointed moderators</li>
                          ) : null}
                          {selected.internalAdmin ? (
                            <li>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[13px] font-semibold text-espresso">
                                  {selected.internalAdmin}
                                </span>
                                <StatusBadge tone="plum" className="bg-[#3e2b36] text-panel border-[#3e2b36]">
                                  Throve internal
                                </StatusBadge>
                              </div>
                              <p className="mt-1 text-[11.5px] leading-snug text-body">
                                Trust & Safety · platform-level safety authority
                              </p>
                            </li>
                          ) : null}
                        </ul>
                      </div>

                      <div>
                        <div className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-espresso">
                          Incidents
                        </div>
                        {selected.linkedIncidents.length === 0 ? (
                          <p className="text-[12px] text-body">No linked incidents</p>
                        ) : (
                          <ul className="space-y-3">
                            {selected.linkedIncidents.map((inc) => (
                              <li key={inc.id} className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[12px] font-semibold text-espresso">
                                    {inc.id}
                                  </span>
                                  <span className="text-[12px] text-body">· {inc.label}</span>
                                  <Link
                                    to="/reports"
                                    className="text-[11px] font-semibold text-plum hover:underline"
                                  >
                                    Open report
                                  </Link>
                                </div>
                                {inc.target ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[12px] font-semibold text-espresso">@{inc.target}</span>
                                    <span className="text-[12px] text-body">· viewer account</span>
                                    <Link
                                      to="/users"
                                      className="text-[11px] font-semibold text-plum hover:underline"
                                    >
                                      Open user
                                    </Link>
                                  </div>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {isSupport || isFinance ? (
                        <Alert className="rounded-[5px] border-dashed border-plum-border bg-plum-soft">
                          <Lock className="size-3.5 text-plum" />
                          <AlertTitle className="text-[11px] font-semibold text-plum">
                            {isSupport ? 'Customer Support' : 'Finance'}
                          </AlertTitle>
                          <AlertDescription className="text-[11px] text-body">
                            End Live, mute and removal controls are not rendered for this role. Notes and escalate
                            only.
                          </AlertDescription>
                        </Alert>
                      ) : null}
                    </div>

                    <div className="border-t border-[#e3d0db] bg-[#f4ecf1] px-5 py-4">
                      <div className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-plum">
                        Platform safety actions
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="justify-start border-[#d9bfcf] bg-panel"
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
                          className="justify-start border-[#d9bfcf] bg-panel"
                          disabled={demoState === 'offline'}
                          asChild
                        >
                          <Link to="/users">Open viewer in Users</Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="justify-start border-hold-border bg-panel text-[#8a5a15]"
                          disabled={demoState === 'offline'}
                          onClick={() => setConfirm('escalate')}
                        >
                          {isSupport ? 'Escalate to T&S' : 'Escalate session risk'}
                        </Button>

                        {canPlatformAct && isActiveLive(selected) && !alreadyEnded ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="justify-start border-risk text-risk hover:bg-risk-bg"
                            disabled={demoState === 'offline'}
                            onClick={() => setConfirm('end')}
                          >
                            End Live for platform safety — requires reason
                          </Button>
                        ) : null}
                      </div>
                      <p className="mt-3 text-[11px] leading-relaxed text-[#7a5a6b]">
                        {canPlatformAct
                          ? 'Ending Live stops the broadcast for host and viewers. It does not change orders or payments. Reason and audit entry are required.'
                          : 'Platform Live actions are hidden for Customer Support and Finance.'}
                        {primaryViewer ? ` Focus: @${primaryViewer}.` : null}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {confirm === 'end' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={`End ${selected.id} for platform safety?`}
          description="Ending the session stops the broadcast for the host and viewers. It does not change orders, payments or payouts."
          confirmLabel="End Live"
          destructive
          requireCheckbox
          checkboxLabel="I have reviewed this session and understand this cannot be undone."
          reasonLabel="Reason (required, recorded)"
          reasonPlaceholder="Serious safety concern in the session that host and appointed moderators have not contained."
          metaRows={[
            { label: 'Affected object', value: `Session ${selected.id}` },
            { label: 'AI assistance', value: 'Signal reviewed by admin' },
            { label: 'Audit entry', value: 'Created on confirm' },
          ]}
          onConfirm={(reason) => {
            if (alreadyEnded) {
              show('Action no longer valid — session is not active');
              setConfirm(null);
              return;
            }
            const stamp = stampNow();
            const by = actorLabel();
            patchSession(selected.id, {
              status: 'Ended',
              endedByPlatform: true,
              flash: `${by} · ${stamp} · reason recorded · audit entry created`,
              timeline: appendTimeline(selected, {
                id: `end-${Date.now()}`,
                at: stamp,
                title: 'Live ended by Trust & Safety',
                detail: `${by} · ${reason}`,
                tone: 'danger',
              }),
            });
            show(`Ended ${selected.id}`);
            setConfirm(null);
          }}
        />
      ) : null}

      {confirm === 'note' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title="Add internal note"
          description={`Note stays on ${selected.id}. Hosts and viewers never see this.`}
          confirmLabel="Save note"
          reasonLabel="Internal note"
          reasonPlaceholder="Context for the next reviewer…"
          defaultReason={noteDraft}
          onConfirm={(reason) => {
            const stamp = stampNow();
            const by = actorLabel();
            patchSession(selected.id, {
              timeline: appendTimeline(selected, {
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
          title={isSupport ? 'Escalate to Trust & Safety' : 'Escalate session risk'}
          description={
            isSupport
              ? `Route ${selected.id} / @${selected.host} to Trust & Safety for platform review.`
              : `Raise session risk on ${selected.id} linked to @${selected.host}.`
          }
          confirmLabel="Escalate"
          reasonLabel="Escalation reason"
          reasonPlaceholder="Why this needs elevated review…"
          onConfirm={(reason) => {
            const stamp = stampNow();
            const by = actorLabel();
            patchSession(selected.id, {
              timeline: appendTimeline(selected, {
                id: `es-${Date.now()}`,
                at: stamp,
                title: isSupport ? 'Escalated to Trust & Safety' : 'Session risk escalated',
                detail: `${by} · ${reason}`,
                tone: 'warn',
              }),
            });
            show(isSupport ? 'Escalated to T&S' : 'Session risk escalated');
            setConfirm(null);
          }}
        />
      ) : null}
    </>
  );
}
