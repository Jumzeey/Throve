import { useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState } from '@/components/admin/empty-state';
import { FieldRow } from '@/components/admin/field-row';
import { FilterChips } from '@/components/admin/filter-chips';
import { Panel } from '@/components/admin/panel';
import { DataTable, Td, Tr } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { mockAudit } from '@/data/mock';
import type { AdminRole } from '@/lib/roles';
import { usePageChrome } from '@/components/layout/shell-chrome';

export function AuditPage() {
  const { session } = useAuth();
  const [sensitivity, setSensitivity] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  usePageChrome({
    title: "Audit log",
    subtitle: "Scoped filters · event detail · immutable trail · role-visible rows",
    search: search,
    onSearchChange: setSearch,
    searchPlaceholder: "Search actor, action, target…",
  });

  const role = (session?.role ?? 'support') as AdminRole;
  const selected = mockAudit.find((a) => a.id === selectedId) ?? null;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockAudit.filter((a) => {
      if (!a.visibleTo.includes(role)) return false;
      if (sensitivity !== 'all' && a.sensitivity.toLowerCase() !== sensitivity) return false;
      if (!q) return true;
      return (
        a.action.toLowerCase().includes(q) ||
        a.actor.toLowerCase().includes(q) ||
        a.target.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      );
    });
  }, [role, sensitivity, search]);

  return (
    <div className="flex flex-col gap-5">
      <FilterChips
        value={sensitivity}
        onChange={setSensitivity}
        options={[
          { id: 'all', label: 'All visible' },
          { id: 'standard', label: 'Standard' },
          { id: 'sensitive', label: 'Sensitive' },
          { id: 'finance', label: 'Finance' },
        ]}
      />

      <Alert className="rounded-[5px] border-border-soft bg-panel-elevated">
        <AlertTitle className="text-[12px] text-espresso">Immutability</AlertTitle>
        <AlertDescription className="text-[11.5px] text-muted">
          Audit events cannot be edited or deleted. This console is read-only for the trail.
        </AlertDescription>
      </Alert>

      {rows.length === 0 ? (
        <Panel>
          <EmptyState title="No audit events in your scope" description="Role-scoped visibility hides rows outside your least privilege." />
        </Panel>
      ) : (
        <DataTable headers={['When', 'Actor', 'Action', 'Target', 'Sensitivity']}>
          {rows.map((a) => (
            <Tr key={a.id} active={a.id === selectedId} onClick={() => setSelectedId(a.id)}>
              <Td className="tabular-nums text-muted-2">{a.at}</Td>
              <Td>
                <div className="font-semibold text-espresso">{a.actor}</div>
                <div className="text-[11px] text-muted">{a.role}</div>
              </Td>
              <Td>{a.action}</Td>
              <Td>{a.target}</Td>
              <Td>
                <StatusBadge
                  tone={a.sensitivity === 'Sensitive' ? 'risk' : a.sensitivity === 'Finance' ? 'hold' : 'neutral'}
                >
                  {a.sensitivity}
                </StatusBadge>
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-xl font-normal text-espresso">{selected?.id}</SheetTitle>
            <SheetDescription className="text-[12px]">{selected?.at}</SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="mt-4 px-4">
              <FieldRow label="Actor">{selected.actor}</FieldRow>
              <FieldRow label="Role">{selected.role}</FieldRow>
              <FieldRow label="Action">{selected.action}</FieldRow>
              <FieldRow label="Target">{selected.target}</FieldRow>
              <FieldRow label="Sensitivity">{selected.sensitivity}</FieldRow>
              <div className="mt-3 rounded border border-border-soft bg-panel-elevated px-3 py-2 text-[12.5px] leading-relaxed text-body">
                {selected.detail}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
