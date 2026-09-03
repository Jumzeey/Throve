import { useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { AiAdvisory } from '@/components/admin/ai-advisory';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { FieldRow } from '@/components/admin/field-row';
import { FilterChips } from '@/components/admin/filter-chips';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { Timeline } from '@/components/admin/timeline';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { mockLive, type MockLive } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { canAct } from '@/lib/roles';
import { usePageChrome } from '@/components/layout/shell-chrome';

function tone(s: MockLive['status']) {
  if (s === 'Live') return 'clear' as const;
  if (s === 'Incident') return 'risk' as const;
  if (s === 'Upcoming') return 'hold' as const;
  return 'neutral' as const;
}

export function LivePage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(mockLive[0]?.id ?? null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  usePageChrome({
    title: "Live",
    subtitle: "Sessions · flagged comments · appointed mods · end Live",
    hideSearch: true,
  });

  const canEnd = session ? canAct(session.role, 'end_live') : false;
  const selected = mockLive.find((s) => s.id === selectedId) ?? null;

  const rows = useMemo(() => {
    return mockLive.filter((s) => {
      if (filter === 'all') return true;
      return s.status.toLowerCase() === filter;
    });
  }, [filter]);

  return (
    <div className="flex flex-col gap-5">
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: 'All', count: mockLive.length },
          { id: 'live', label: 'Live' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'incident', label: 'Incident' },
          { id: 'ended', label: 'Ended' },
        ]}
      />
      {banner}

      <div className="grid grid-cols-[1fr_1.1fr] gap-4">
        <div className="flex flex-col gap-3">
          {rows.length === 0 ? (
            <Panel>
              <EmptyState title="No sessions" />
            </Panel>
          ) : (
            rows.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`rounded-[5px] border px-4 py-3 text-left transition ${
                  s.id === selectedId
                    ? 'border-plum bg-plum-soft/40'
                    : 'border-border-soft bg-card hover:border-espresso/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge tone={tone(s.status)}>{s.status}</StatusBadge>
                  <span className="text-[11px] tabular-nums text-muted">{s.viewers} viewers</span>
                </div>
                <div className="mt-2 font-display text-[17px] text-espresso">{s.title}</div>
                <div className="mt-0.5 text-[11.5px] text-muted">
                  {s.id} · @{s.host} · {s.reports} reports
                </div>
              </button>
            ))
          )}
        </div>

        <Panel title={selected?.title ?? 'Select a session'} subtitle={selected?.id}>
          {selected ? (
            <div className="flex flex-col gap-4">
              {!selected.hostApproved ? (
                <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                  <AlertTitle className="text-[12px] text-[#8a5a15]">Host approval</AlertTitle>
                  <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                    @{selected.host} is not an approved live host. Review Users before allowing go-live.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex aspect-video items-center justify-center rounded border border-dashed border-border-soft bg-panel-elevated text-[12px] text-muted">
                Video placeholder · mock stream
              </div>

              <AiAdvisory kind="INCIDENT SUMMARY">
                {selected.status === 'Incident'
                  ? 'Prior unsafe behaviour led to forced end and host revoke. Audit trail complete.'
                  : selected.flaggedComments.length
                    ? `${selected.flaggedComments.length} flagged comments. Prefer comment action before ending Live.`
                    : 'No active incident signals for this session.'}
              </AiAdvisory>

              <div>
                <FieldRow label="Host">@{selected.host}</FieldRow>
                <FieldRow label="Started">{selected.startedAt}</FieldRow>
                <FieldRow label="Mods">
                  {selected.appointedMods.length ? selected.appointedMods.map((m) => `@${m}`).join(', ') : 'None'}
                </FieldRow>
              </div>

              {selected.flaggedComments.length > 0 ? (
                <div>
                  <div className="mb-2 text-[11.5px] font-semibold text-espresso">Flagged comments</div>
                  <ul className="flex flex-col gap-2">
                    {selected.flaggedComments.map((c) => (
                      <li key={c.id} className="rounded border border-border-soft px-3 py-2 text-[12px]">
                        <div className="font-semibold text-espresso">@{c.user}</div>
                        <div className="text-body">{c.text}</div>
                        <div className="mt-0.5 text-[11px] text-muted">{c.reason}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <div className="mb-2 text-[11.5px] font-semibold text-espresso">Timeline</div>
                <Timeline events={selected.timeline} />
              </div>

              {canEnd && selected.status === 'Live' ? (
                <Button variant="destructive" onClick={() => setConfirmEnd(true)}>
                  End Live
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-[12px] text-muted">Choose a session card.</p>
          )}
        </Panel>
      </div>

      {selected ? (
        <ConfirmActionDialog
          open={confirmEnd}
          onOpenChange={setConfirmEnd}
          title="End Live session"
          description={`Force-end ${selected.id} for all viewers. Host will be notified.`}
          confirmLabel="End Live"
          destructive
          requireCheckbox
          onConfirm={(reason) => {
            show(`Ended ${selected.id} · ${reason.slice(0, 40)}`);
          }}
        />
      ) : null}
    </div>
  );
}
