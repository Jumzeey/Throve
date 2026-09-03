import { useMemo, useState } from 'react';
import { AiAdvisory } from '@/components/admin/ai-advisory';
import { EmptyState } from '@/components/admin/empty-state';
import { FieldRow } from '@/components/admin/field-row';
import { FilterChips } from '@/components/admin/filter-chips';
import { Panel } from '@/components/admin/panel';
import { DataTable, Td, Tr } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { formatNaira, mockPayments, type MockPayment } from '@/data/mock';
import { usePageChrome } from '@/components/layout/shell-chrome';

function tone(s: MockPayment['status']) {
  if (s === 'Captured') return 'clear' as const;
  if (s === 'Failed') return 'risk' as const;
  if (s === 'Attention') return 'hold' as const;
  return 'neutral' as const;
}

export function PaymentsPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(mockPayments[0]?.id ?? null);
  usePageChrome({
    title: "Payments",
    subtitle: "Captured funds · attention filters · masked provider refs · no mark-paid",
    search: search,
    onSearchChange: setSearch,
    searchPlaceholder: "Search payment or order ID…",
  });

  const selected = mockPayments.find((p) => p.id === selectedId) ?? null;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockPayments.filter((p) => {
      if (filter === 'attention' && p.status !== 'Attention' && p.status !== 'Failed') return false;
      if (filter === 'captured' && p.status !== 'Captured') return false;
      if (filter === 'failed' && p.status !== 'Failed') return false;
      if (!q) return true;
      return p.id.toLowerCase().includes(q) || p.orderId.toLowerCase().includes(q);
    });
  }, [filter, search]);

  return (
    <div className="flex flex-col gap-5">
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: 'All' },
          { id: 'attention', label: 'Needs attention' },
          { id: 'captured', label: 'Captured' },
          { id: 'failed', label: 'Failed' },
        ]}
      />

      <div className="grid grid-cols-[1.35fr_1fr] gap-4">
        {rows.length === 0 ? (
          <Panel>
            <EmptyState title="No payments" actionLabel="Clear" onAction={() => { setFilter('all'); setSearch(''); }} />
          </Panel>
        ) : (
          <DataTable headers={['Payment', 'Order', 'Amount', 'Method', 'Status']}>
            {rows.map((p) => (
              <Tr key={p.id} active={p.id === selectedId} onClick={() => setSelectedId(p.id)}>
                <Td>
                  <div className="font-semibold text-espresso">{p.id}</div>
                  <div className="text-[11px] text-muted">{p.at}</div>
                </Td>
                <Td>{p.orderId}</Td>
                <Td>{formatNaira(p.amount)}</Td>
                <Td>{p.method}</Td>
                <Td>
                  <StatusBadge tone={tone(p.status)}>{p.status}</StatusBadge>
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}

        <Panel title={selected?.id ?? 'Select a payment'} subtitle={selected?.providerRefMasked}>
          {selected ? (
            <div className="flex flex-col gap-3">
              {selected.aiDuplicateRisk ? <AiAdvisory kind="SIGNAL">{selected.aiDuplicateRisk}</AiAdvisory> : null}
              {selected.attentionReason ? (
                <div className="rounded border border-hold-border bg-hold-bg px-3 py-2 text-[12px] text-[#8a5a15]">
                  {selected.attentionReason}
                </div>
              ) : null}
              <div>
                <FieldRow label="Order">{selected.orderId}</FieldRow>
                <FieldRow label="Provider ref">{selected.providerRefMasked}</FieldRow>
                <FieldRow label="Method">{selected.method}</FieldRow>
                <FieldRow label="Status">{selected.status}</FieldRow>
              </div>
              <div className="rounded border border-border-soft px-3 py-2">
                <div className="mb-1 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">Breakdown</div>
                {selected.breakdown.map((b) => (
                  <FieldRow key={b.label} label={b.label}>
                    {formatNaira(b.amount)}
                  </FieldRow>
                ))}
                <FieldRow label="Total">
                  <span className="font-semibold">{formatNaira(selected.amount)}</span>
                </FieldRow>
              </div>
              <p className="text-[11px] text-muted">
                Payments are provider-authoritative. There is no “mark paid” control in admin.
              </p>
            </div>
          ) : (
            <p className="text-[12px] text-muted">Choose a payment.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
