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
import { Button } from '@/components/ui/button';
import { mockReviews, type MockReview } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { canAct } from '@/lib/roles';
import { usePageChrome } from '@/components/layout/shell-chrome';

function tone(s: MockReview['status']) {
  if (s === 'Visible') return 'clear' as const;
  if (s === 'Flagged') return 'hold' as const;
  return 'neutral' as const;
}

export function ReviewsPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(mockReviews[0]?.id ?? null);
  const [confirm, setConfirm] = useState(false);

  usePageChrome({
    title: "Reviews",
    subtitle: "Filters · AI summary · hide comment (rating immutable)",
    search: search,
    onSearchChange: setSearch,
    searchPlaceholder: "Search review, comment, parties…",
  });

  const canHide = session ? canAct(session.role, 'hide_review') : false;
  const selected = mockReviews.find((r) => r.id === selectedId) ?? null;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockReviews.filter((r) => {
      if (filter !== 'all' && r.status.toLowerCase() !== filter) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        r.seller.includes(q) ||
        r.buyer.includes(q)
      );
    });
  }, [filter, search]);

  return (
    <div className="flex flex-col gap-5">
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: 'All' },
          { id: 'visible', label: 'Visible' },
          { id: 'flagged', label: 'Flagged' },
          { id: 'hidden', label: 'Hidden' },
        ]}
      />
      {banner}

      <div className="grid grid-cols-[1.35fr_1fr] gap-4">
        {rows.length === 0 ? (
          <Panel>
            <EmptyState title="No reviews" actionLabel="Clear" onAction={() => { setFilter('all'); setSearch(''); }} />
          </Panel>
        ) : (
          <DataTable headers={['Review', 'Rating', 'Parties', 'Status']}>
            {rows.map((r) => (
              <Tr key={r.id} active={r.id === selectedId} onClick={() => setSelectedId(r.id)}>
                <Td>
                  <div className="font-semibold text-espresso">{r.id}</div>
                  <div className="line-clamp-1 text-[11px] text-muted">{r.comment}</div>
                </Td>
                <Td>{r.rating}★</Td>
                <Td>
                  @{r.buyer} → @{r.seller}
                </Td>
                <Td>
                  <StatusBadge tone={tone(r.status)}>{r.status}</StatusBadge>
                </Td>
              </Tr>
            ))}
          </DataTable>
        )}

        <Panel title={selected?.id ?? 'Select a review'} subtitle={selected?.orderId}>
          {selected ? (
            <div className="flex flex-col gap-3">
              <AiAdvisory>{selected.aiSummary}</AiAdvisory>
              <div>
                <FieldRow label="Rating">
                  <span className="font-semibold">{selected.rating}★ (immutable)</span>
                </FieldRow>
                <FieldRow label="Buyer">@{selected.buyer}</FieldRow>
                <FieldRow label="Seller">@{selected.seller}</FieldRow>
                <FieldRow label="Created">{selected.createdAt}</FieldRow>
              </div>
              <div className="rounded border border-border-soft bg-panel-elevated px-3 py-2 text-[12.5px] leading-relaxed text-body">
                {selected.comment}
              </div>
              {canHide && selected.status !== 'Hidden' ? (
                <Button variant="destructive" onClick={() => setConfirm(true)}>
                  Hide comment
                </Button>
              ) : null}
              <p className="text-[11px] text-muted">Hiding removes the comment text from public view. The star rating remains.</p>
            </div>
          ) : (
            <p className="text-[12px] text-muted">Choose a review.</p>
          )}
        </Panel>
      </div>

      {selected ? (
        <ConfirmActionDialog
          open={confirm}
          onOpenChange={setConfirm}
          title="Hide review comment"
          description={`Hide the comment on ${selected.id}. Rating (${selected.rating}★) will stay visible.`}
          confirmLabel="Hide comment"
          destructive
          requireCheckbox
          onConfirm={(reason) => {
            show(`Hidden comment ${selected.id} · ${reason.slice(0, 40)}`);
          }}
        />
      ) : null}
    </div>
  );
}
