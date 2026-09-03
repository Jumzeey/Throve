import { useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { FieldRow } from '@/components/admin/field-row';
import { FilterChips } from '@/components/admin/filter-chips';
import { Panel } from '@/components/admin/panel';
import { DataTable, Td, Tr } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatNaira, mockPayouts, type MockPayout } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { canAct } from '@/lib/roles';
import { usePageChrome } from '@/components/layout/shell-chrome';

function tone(s: MockPayout['status']) {
  if (s === 'Paid') return 'clear' as const;
  if (s === 'On hold') return 'hold' as const;
  return 'plum' as const;
}

export function PayoutsPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(mockPayouts[0]?.id ?? null);
  const [confirm, setConfirm] = useState<'process' | 'hold' | 'release' | null>(null);

  usePageChrome({
    title: "Payouts",
    subtitle: "Sale / commission / fee / net · holds · 0% promo · process confirm",
    hideSearch: true,
  });

  const canExecute = session ? canAct(session.role, 'execute_payout') : false;
  const canHold = session ? canAct(session.role, 'hold_payout') : false;
  const selected = mockPayouts.find((p) => p.id === selectedId) ?? null;

  const rows = useMemo(() => {
    return mockPayouts.filter((p) => {
      if (filter === 'all') return true;
      if (filter === 'hold') return p.status === 'On hold';
      if (filter === 'queued') return p.status === 'Queued';
      if (filter === 'paid') return p.status === 'Paid';
      if (filter === 'promo') return !!p.promoZeroCommission;
      return true;
    });
  }, [filter]);

  return (
    <div className="flex flex-col gap-5">
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: 'All' },
          { id: 'queued', label: 'Queued' },
          { id: 'hold', label: 'On hold' },
          { id: 'paid', label: 'Paid' },
          { id: 'promo', label: '0% commission' },
        ]}
      />
      {banner}

      <div className="grid grid-cols-[1.35fr_1fr] gap-4">
        {rows.length === 0 ? (
          <Panel>
            <EmptyState title="No payouts" />
          </Panel>
        ) : (
          <DataTable headers={['Payout', 'Seller', 'Net', 'Period', 'Status']}>
            {rows.map((p) => (
              <Tr key={p.id} active={p.id === selectedId} onClick={() => setSelectedId(p.id)}>
                <Td className="font-semibold text-espresso">{p.id}</Td>
                <Td>@{p.seller}</Td>
                <Td>{formatNaira(p.net)}</Td>
                <Td>{p.period}</Td>
                <Td>
                  <StatusBadge tone={tone(p.status)}>{p.status}</StatusBadge>
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}

        <Panel title={selected?.id ?? 'Select a payout'} subtitle={selected ? `@${selected.seller}` : undefined}>
          {selected ? (
            <div className="flex flex-col gap-3">
              {selected.promoZeroCommission ? (
                <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                  <AlertTitle className="text-[12px] text-clear">0% commission promo</AlertTitle>
                  <AlertDescription className="text-[11.5px] text-clear">
                    Commission rate is 0% for this period. Net equals sale total minus fees.
                  </AlertDescription>
                </Alert>
              ) : null}
              {selected.holdReason ? (
                <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                  <AlertTitle className="text-[12px] text-[#8a5a15]">On hold</AlertTitle>
                  <AlertDescription className="text-[11.5px] text-[#8a5a15]">{selected.holdReason}</AlertDescription>
                </Alert>
              ) : null}

              <div className="rounded border border-border-soft px-3 py-2">
                <FieldRow label="Sale total">{formatNaira(selected.saleTotal)}</FieldRow>
                <FieldRow label={`Commission (${Math.round(selected.commissionRate * 100)}%)`}>
                  {formatNaira(selected.commission)}
                </FieldRow>
                <FieldRow label="Fees">{formatNaira(selected.fees)}</FieldRow>
                <FieldRow label="Net">
                  <span className="font-semibold">{formatNaira(selected.net)}</span>
                </FieldRow>
              </div>

              <div className="flex flex-wrap gap-2">
                {canExecute && selected.status === 'Queued' ? (
                  <Button onClick={() => setConfirm('process')}>Process payout</Button>
                ) : null}
                {canHold && selected.status === 'Queued' ? (
                  <Button variant="outline" onClick={() => setConfirm('hold')}>
                    Place hold
                  </Button>
                ) : null}
                {canHold && selected.status === 'On hold' ? (
                  <Button onClick={() => setConfirm('release')}>Release hold</Button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-muted">Choose a payout.</p>
          )}
        </Panel>
      </div>

      {confirm && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={
            confirm === 'process' ? 'Process payout' : confirm === 'hold' ? 'Place payout hold' : 'Release payout hold'
          }
          description={
            confirm === 'process'
              ? `Pay ${formatNaira(selected.net)} to @${selected.seller} for ${selected.period}.`
              : confirm === 'hold'
                ? `Hold ${selected.id} until risk or KYC clears.`
                : `Release hold on ${selected.id} and return to queue.`
          }
          confirmLabel={confirm === 'process' ? 'Process' : confirm === 'hold' ? 'Hold' : 'Release'}
          destructive={confirm === 'process'}
          requireCheckbox={confirm === 'process'}
          onConfirm={(reason) => {
            show(`${confirm} · ${selected.id} · ${reason.slice(0, 36)}`);
            setConfirm(null);
          }}
        />
      ) : null}
    </div>
  );
}
