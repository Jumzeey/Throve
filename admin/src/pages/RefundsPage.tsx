import { useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { FieldRow } from '@/components/admin/field-row';
import { FilterChips } from '@/components/admin/filter-chips';
import { Panel } from '@/components/admin/panel';
import { DataTable, Td, Tr } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatNaira, mockRefunds, type MockRefund } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { canAct } from '@/lib/roles';
import { usePageChrome } from '@/components/layout/shell-chrome';

function tone(s: MockRefund['status']) {
  if (s === 'Executed') return 'clear' as const;
  if (s === 'Failed') return 'risk' as const;
  return 'hold' as const;
}

export function RefundsPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(mockRefunds[0]?.id ?? null);
  const [includeDelivery, setIncludeDelivery] = useState(true);
  const [confirm, setConfirm] = useState(false);

  usePageChrome({
    title: "Refunds",
    subtitle: "T&S-approved instructions · component breakdown · execute confirm",
    hideSearch: true,
  });

  const canExecute = session ? canAct(session.role, 'execute_refund') : false;
  const selected = mockRefunds.find((r) => r.id === selectedId) ?? null;

  const rows = useMemo(() => {
    return mockRefunds.filter((r) => {
      if (filter === 'all') return true;
      return r.status.toLowerCase() === filter;
    });
  }, [filter]);

  const previewTotal = selected
    ? selected.itemAmount + (includeDelivery ? selected.deliveryAmount : 0)
    : 0;

  return (
    <div className="flex flex-col gap-5">
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: 'All' },
          { id: 'approved', label: 'Approved' },
          { id: 'executed', label: 'Executed' },
          { id: 'failed', label: 'Failed' },
        ]}
      />
      {banner}

      <div className="grid grid-cols-[1.35fr_1fr] gap-4">
        {rows.length === 0 ? (
          <Panel>
            <EmptyState title="No refunds" />
          </Panel>
        ) : (
          <DataTable headers={['Refund', 'Order', 'Amount', 'Approved by', 'Status']}>
            {rows.map((r) => (
              <Tr
                key={r.id}
                active={r.id === selectedId}
                onClick={() => {
                  setSelectedId(r.id);
                  setIncludeDelivery(r.includeDelivery);
                }}
              >
                <Td className="font-semibold text-espresso">{r.id}</Td>
                <Td>{r.orderId}</Td>
                <Td>{formatNaira(r.amount)}</Td>
                <Td>{r.approvedBy}</Td>
                <Td>
                  <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge>
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}

        <Panel title={selected?.id ?? 'Select a refund'} subtitle={selected?.orderId}>
          {selected ? (
            <div className="flex flex-col gap-3">
              <div className="rounded border border-border-soft px-3 py-2">
                <div className="mb-1 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">Components</div>
                {selected.components.map((c) => (
                  <FieldRow key={c.label} label={c.label}>
                    {formatNaira(c.amount)}
                  </FieldRow>
                ))}
              </div>

              {selected.status === 'Approved' && canExecute ? (
                <>
                  <label className="flex items-center gap-2 text-[12.5px] text-body">
                    <Checkbox
                      checked={includeDelivery}
                      onCheckedChange={(v) => setIncludeDelivery(v === true)}
                      disabled={selected.deliveryAmount === 0}
                    />
                    Include delivery ({formatNaira(selected.deliveryAmount)})
                  </label>
                  <FieldRow label="Execute total">
                    <span className="font-semibold">{formatNaira(previewTotal)}</span>
                  </FieldRow>
                  <Button onClick={() => setConfirm(true)}>Execute refund</Button>
                </>
              ) : null}

              {selected.status === 'Executed' ? (
                <p className="text-[11.5px] text-muted">Already executed. Provider settlement is immutable in this mock.</p>
              ) : null}
              {selected.status === 'Failed' ? (
                <p className="text-[11.5px] text-risk">Provider failure — retry from Finance runbook (mock).</p>
              ) : null}
            </div>
          ) : (
            <p className="text-[12px] text-muted">Choose a refund.</p>
          )}
        </Panel>
      </div>

      {selected ? (
        <ConfirmActionDialog
          open={confirm}
          onOpenChange={setConfirm}
          title="Execute refund"
          description={`Send ${formatNaira(previewTotal)} to the buyer for ${selected.orderId}${
            includeDelivery ? ' including delivery' : ' excluding delivery'
          }.`}
          confirmLabel="Execute"
          destructive
          requireCheckbox
          onConfirm={(reason) => {
            show(`Executed ${selected.id} · ${formatNaira(previewTotal)} · ${reason.slice(0, 32)}`);
          }}
        />
      ) : null}
    </div>
  );
}
