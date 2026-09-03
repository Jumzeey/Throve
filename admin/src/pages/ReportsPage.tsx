import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { AiAdvisory } from '@/components/admin/ai-advisory';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { FieldRow, RestrictedValue } from '@/components/admin/field-row';
import { FilterChips } from '@/components/admin/filter-chips';
import { Panel } from '@/components/admin/panel';
import { DataTable, Td, Tr } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { mockReports, type MockReport } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { usePageChrome } from '@/components/layout/shell-chrome';

function tone(s: MockReport['status']) {
  if (s === 'Awaiting') return 'hold' as const;
  if (s === 'Action taken') return 'clear' as const;
  if (s === 'Dismissed') return 'neutral' as const;
  return 'plum' as const;
}

export function ReportsPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [status, setStatus] = useState('all');
  const [route, setRoute] = useState('all');
  const [priority, setPriority] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(mockReports[0]?.id ?? null);
  const [confirm, setConfirm] = useState<'close' | 'escalate' | 'associate' | null>(null);

  usePageChrome({
    title: "Reports",
    subtitle: "Intake · route map · associate / close / escalate",
    search: search,
    onSearchChange: setSearch,
    searchPlaceholder: "Search report ID, reason, target…",
  });

  const isSupport = session?.role === 'support';
  const selected = mockReports.find((r) => r.id === selectedId) ?? null;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockReports.filter((r) => {
      if (status !== 'all' && r.status.toLowerCase().replace(' ', '-') !== status) return false;
      if (route !== 'all' && r.route.toLowerCase().replace(' ', '-') !== route) return false;
      if (priority !== 'all' && r.priority.toLowerCase() !== priority) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.target.toLowerCase().includes(q)
      );
    });
  }, [status, route, priority, search]);

  const nextModule =
    selected?.route === 'Listing'
      ? { to: '/listings', label: 'Act in Listings' }
      : selected?.route === 'User'
        ? { to: '/users', label: 'Act in Users' }
        : { to: '/live', label: 'Act in Live' };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <FilterChips
          value={status}
          onChange={setStatus}
          options={[
            { id: 'all', label: 'All status' },
            { id: 'awaiting', label: 'Awaiting' },
            { id: 'linked', label: 'Linked' },
            { id: 'action-taken', label: 'Action taken' },
            { id: 'dismissed', label: 'Dismissed' },
          ]}
        />
        <FilterChips
          value={route}
          onChange={setRoute}
          options={[
            { id: 'all', label: 'All routes' },
            { id: 'user', label: 'User' },
            { id: 'listing', label: 'Listing' },
            { id: 'live', label: 'Live' },
            { id: 'live-comment', label: 'Live comment' },
          ]}
        />
        <FilterChips
          value={priority}
          onChange={setPriority}
          options={[
            { id: 'all', label: 'All priority' },
            { id: 'p1', label: 'P1' },
            { id: 'p2', label: 'P2' },
            { id: 'p3', label: 'P3' },
          ]}
        />
      </div>
      {banner}

      <div className="grid grid-cols-[1.35fr_1fr] gap-4">
        {rows.length === 0 ? (
          <Panel>
            <EmptyState title="No reports" actionLabel="Clear filters" onAction={() => { setStatus('all'); setRoute('all'); setPriority('all'); setSearch(''); }} />
          </Panel>
        ) : (
          <DataTable headers={['Report', 'Route', 'Priority', 'Assigned', 'Status']}>
            {rows.map((r) => (
              <Tr key={r.id} active={r.id === selectedId} onClick={() => setSelectedId(r.id)}>
                <Td>
                  <div className="font-semibold text-espresso">{r.reason}</div>
                  <div className="text-[11px] text-muted">
                    {r.id} · {r.target}
                  </div>
                </Td>
                <Td>{r.route}</Td>
                <Td>
                  <StatusBadge tone={r.priority === 'P1' ? 'risk' : r.priority === 'P2' ? 'hold' : 'neutral'}>
                    {r.priority}
                  </StatusBadge>
                </Td>
                <Td>{r.assigned}</Td>
                <Td>
                  <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge>
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}

        <Panel title={selected?.id ?? 'Select a report'} subtitle={selected?.createdAt}>
          {selected ? (
            <div className="flex flex-col gap-3">
              <AiAdvisory>{selected.aiSummary}</AiAdvisory>
              <div className="rounded border border-border-soft bg-panel-elevated px-3 py-2 text-[11.5px] text-body">
                <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">Routing map</div>
                <p className="mt-1">{selected.routingHint}</p>
              </div>
              <div>
                <FieldRow label="Reporter">@{selected.reporter}</FieldRow>
                <FieldRow label="Target">{selected.target}</FieldRow>
                <FieldRow label="Department">{selected.department}</FieldRow>
                <FieldRow label="Evidence">
                  {isSupport && selected.evidenceRestricted ? (
                    <RestrictedValue />
                  ) : (
                    `${selected.evidenceCount} items`
                  )}
                </FieldRow>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setConfirm('associate')}>
                  Associate
                </Button>
                <Button variant="outline" onClick={() => setConfirm('close')}>
                  Close
                </Button>
                <Button onClick={() => setConfirm('escalate')}>Escalate</Button>
                <Button variant="outline" asChild>
                  <Link to={nextModule.to}>{nextModule.label}</Link>
                </Button>
              </div>
              {isSupport ? (
                <p className="text-[11px] text-muted">Support: evidence may be Restricted. Enforcement happens in destination modules.</p>
              ) : null}
            </div>
          ) : (
            <p className="text-[12px] text-muted">Choose a report.</p>
          )}
        </Panel>
      </div>

      {confirm && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={confirm === 'close' ? 'Close report' : confirm === 'escalate' ? 'Escalate report' : 'Associate evidence'}
          description={`${confirm} ${selected.id} · ${selected.reason}`}
          confirmLabel={confirm === 'close' ? 'Close' : confirm === 'escalate' ? 'Escalate' : 'Associate'}
          onConfirm={(reason) => {
            show(`${confirm} · ${selected.id} · ${reason.slice(0, 40)}`);
            setConfirm(null);
          }}
        />
      ) : null}
    </div>
  );
}
