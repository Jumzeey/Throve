import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/admin/empty-state';
import { FieldRow } from '@/components/admin/field-row';
import { FilterChips } from '@/components/admin/filter-chips';
import { Panel } from '@/components/admin/panel';
import { DataTable, Td, Tr } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { Timeline } from '@/components/admin/timeline';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatNaira, mockOrders, type MockOrder } from '@/data/mock';
import { usePageChrome } from '@/components/layout/shell-chrome';

function tone(s: MockOrder['status']) {
  if (s === 'Completed') return 'clear' as const;
  if (s === 'Disputed') return 'risk' as const;
  if (s === 'Cancelled') return 'neutral' as const;
  if (s === 'Dispatched') return 'hold' as const;
  return 'plum' as const;
}

export function OrdersPage() {
  const [lifecycle, setLifecycle] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(mockOrders[0]?.id ?? null);

  usePageChrome({
    title: "Orders",
    subtitle: "Lifecycle · payment & delivery breakdown · timeline · no admin status editing",
    search: search,
    onSearchChange: setSearch,
    searchPlaceholder: "Search order ID, listing, buyer, seller…",
  });

  const selected = mockOrders.find((o) => o.id === selectedId) ?? null;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockOrders.filter((o) => {
      if (lifecycle !== 'all' && o.status.toLowerCase() !== lifecycle) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.listing.toLowerCase().includes(q) ||
        o.buyer.includes(q) ||
        o.seller.includes(q)
      );
    });
  }, [lifecycle, search]);

  return (
    <div className="flex flex-col gap-5">
      <FilterChips
        value={lifecycle}
        onChange={setLifecycle}
        options={[
          { id: 'all', label: 'All' },
          { id: 'paid', label: 'Paid' },
          { id: 'dispatched', label: 'Dispatched' },
          { id: 'completed', label: 'Completed' },
          { id: 'disputed', label: 'Disputed' },
          { id: 'cancelled', label: 'Cancelled' },
        ]}
      />

      <div className="grid grid-cols-[1.35fr_1fr] gap-4">
        {rows.length === 0 ? (
          <Panel>
            <EmptyState title="No orders" actionLabel="Clear" onAction={() => { setLifecycle('all'); setSearch(''); }} />
          </Panel>
        ) : (
          <DataTable headers={['Order', 'Parties', 'Total', 'Delivery', 'Status']}>
            {rows.map((o) => (
              <Tr key={o.id} active={o.id === selectedId} onClick={() => setSelectedId(o.id)}>
                <Td>
                  <div className="font-semibold text-espresso">{o.id}</div>
                  <div className="text-[11px] text-muted">{o.listing}</div>
                </Td>
                <Td>
                  <div className="text-[12px]">@{o.buyer}</div>
                  <div className="text-[11px] text-muted">seller @{o.seller}</div>
                </Td>
                <Td>{formatNaira(o.total)}</Td>
                <Td>{o.delivery}</Td>
                <Td>
                  <StatusBadge tone={tone(o.status)}>{o.status}</StatusBadge>
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}

        <Panel title={selected?.id ?? 'Select an order'} subtitle={selected?.createdAt}>
          {selected ? (
            <div className="flex flex-col gap-3">
              {selected.status === 'Disputed' ? (
                <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                  <AlertTitle className="text-[12px] text-risk">Disputed · fulfillment paused</AlertTitle>
                  <AlertDescription className="text-[11.5px] text-risk">
                    Hold active while {selected.disputeId} is open.{' '}
                    <Link to="/disputes" className="font-semibold underline">
                      Open disputes
                    </Link>
                    . Admin cannot force a status change.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div>
                <FieldRow label="Listing">
                  {selected.listing} ({selected.listingId})
                </FieldRow>
                <FieldRow label="Buyer">@{selected.buyer}</FieldRow>
                <FieldRow label="Seller">@{selected.seller}</FieldRow>
                <FieldRow label="Payment">{selected.paymentId}</FieldRow>
              </div>

              <div className="rounded border border-border-soft px-3 py-2">
                <div className="mb-1 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">Breakdown</div>
                <FieldRow label="Item">{formatNaira(selected.itemPrice)}</FieldRow>
                <FieldRow label="Delivery">{formatNaira(selected.deliveryFee)}</FieldRow>
                <FieldRow label="Total">
                  <span className="font-semibold">{formatNaira(selected.total)}</span>
                </FieldRow>
              </div>

              <div>
                <div className="mb-2 text-[11.5px] font-semibold text-espresso">Timeline</div>
                <Timeline events={selected.timeline} />
              </div>

              <p className="text-[11px] text-muted">
                Status is system-driven from checkout / shipping / disputes. There is no admin status dropdown.
              </p>
            </div>
          ) : (
            <p className="text-[12px] text-muted">Choose an order.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
