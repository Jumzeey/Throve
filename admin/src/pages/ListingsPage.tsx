import { useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { AiAdvisory } from '@/components/admin/ai-advisory';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { FieldRow } from '@/components/admin/field-row';
import { FilterChips } from '@/components/admin/filter-chips';
import { Panel } from '@/components/admin/panel';
import { DataTable, Td, Tr } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatNaira, mockListings, type MockListing } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { canAct } from '@/lib/roles';
import { usePageChrome } from '@/components/layout/shell-chrome';

function tone(s: MockListing['status']) {
  if (s === 'Available') return 'clear' as const;
  if (s === 'Reserved') return 'hold' as const;
  if (s === 'Hidden') return 'risk' as const;
  return 'neutral' as const;
}

export function ListingsPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [status, setStatus] = useState('all');
  const [dept, setDept] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(mockListings[0]?.id ?? null);
  const [confirm, setConfirm] = useState<'remove' | 'restore' | null>(null);

  usePageChrome({
    title: "Listings",
    subtitle: "Catalog status · reports · remove / restore (T&S)",
    search: search,
    onSearchChange: setSearch,
    searchPlaceholder: "Search title, listing ID, seller…",
  });

  const canModerate = session ? canAct(session.role, 'hide_listing') : false;
  const selected = mockListings.find((l) => l.id === selectedId) ?? null;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockListings.filter((l) => {
      if (status !== 'all' && l.status.toLowerCase() !== status) return false;
      if (dept !== 'all' && l.department.toLowerCase() !== dept) return false;
      if (!q) return true;
      return l.title.toLowerCase().includes(q) || l.id.toLowerCase().includes(q) || l.seller.includes(q);
    });
  }, [status, dept, search]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <FilterChips
          value={status}
          onChange={setStatus}
          options={[
            { id: 'all', label: 'All status' },
            { id: 'available', label: 'Available' },
            { id: 'reserved', label: 'Reserved' },
            { id: 'sold', label: 'Sold' },
            { id: 'hidden', label: 'Hidden' },
          ]}
        />
        <FilterChips
          value={dept}
          onChange={setDept}
          options={[
            { id: 'all', label: 'All depts' },
            { id: 'women', label: 'Women' },
            { id: 'men', label: 'Men' },
          ]}
        />
      </div>
      {banner}

      <div className="grid grid-cols-[1.4fr_0.95fr] gap-4">
        {rows.length === 0 ? (
          <Panel>
            <EmptyState title="No listings" actionLabel="Reset filters" onAction={() => { setStatus('all'); setDept('all'); setSearch(''); }} />
          </Panel>
        ) : (
          <DataTable headers={['Listing', 'Dept', 'Price', 'Status', 'Reports']}>
            {rows.map((l) => (
              <Tr key={l.id} active={l.id === selectedId} onClick={() => setSelectedId(l.id)}>
                <Td>
                  <div className="font-semibold text-espresso">{l.title}</div>
                  <div className="text-[11px] text-muted">
                    {l.id} · @{l.seller}
                  </div>
                </Td>
                <Td>
                  {l.department} / {l.category}
                </Td>
                <Td>{formatNaira(l.price)}</Td>
                <Td>
                  <StatusBadge tone={tone(l.status)}>{l.status}</StatusBadge>
                </Td>
                <Td>{l.reports}</Td>
              </Tr>
            ))}
          </DataTable>
        )}

        <Panel title={selected?.title ?? 'Select a listing'} subtitle={selected?.id}>
          {selected ? (
            <div className="flex flex-col gap-3">
              <AiAdvisory kind="SIGNAL">{selected.aiSignal}</AiAdvisory>
              {selected.status === 'Reserved' && selected.reservedOrderId ? (
                <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                  <AlertTitle className="text-[12px] text-[#8a5a15]">Reserved + order</AlertTitle>
                  <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                    Linked to {selected.reservedOrderId}. Prefer pause/hold over remove while commerce is open.
                  </AlertDescription>
                </Alert>
              ) : null}
              <div>
                {selected.catalogReadonly.map((f) => (
                  <FieldRow key={f.label} label={f.label}>
                    {f.value}
                  </FieldRow>
                ))}
                <FieldRow label="Condition">{selected.condition}</FieldRow>
                <FieldRow label="Price">{formatNaira(selected.price)}</FieldRow>
                <FieldRow label="Status">{selected.status}</FieldRow>
              </div>
              <p className="text-[11px] text-muted">Catalog fields are read-only in admin. Status changes via remove/restore only.</p>
              <div className="flex flex-wrap gap-2">
                {canModerate && selected.status !== 'Hidden' ? (
                  <Button variant="destructive" onClick={() => setConfirm('remove')}>
                    Remove listing
                  </Button>
                ) : null}
                {canModerate && selected.status === 'Hidden' ? (
                  <Button onClick={() => setConfirm('restore')}>Restore listing</Button>
                ) : null}
                {!canModerate ? (
                  <StatusBadge tone="neutral">Status + note + escalate only</StatusBadge>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-muted">Choose a row.</p>
          )}
        </Panel>
      </div>

      {confirm && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={confirm === 'remove' ? 'Remove listing' : 'Restore listing'}
          description={
            confirm === 'remove'
              ? `Hide ${selected.id} from the marketplace. Buyers will no longer see it.`
              : `Restore ${selected.id} to Available (or prior commerce state).`
          }
          confirmLabel={confirm === 'remove' ? 'Remove' : 'Restore'}
          destructive={confirm === 'remove'}
          requireCheckbox={confirm === 'remove'}
          onConfirm={(reason) => {
            show(`${confirm === 'remove' ? 'Removed' : 'Restored'} ${selected.id} · ${reason.slice(0, 40)}`);
            setConfirm(null);
          }}
        />
      ) : null}
    </div>
  );
}
