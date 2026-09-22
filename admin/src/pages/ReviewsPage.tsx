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
import { mockReviews, type MockReview } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { canAct, ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { Check, Lock, Star, X } from 'lucide-react';

type DemoState = 'ready' | 'loading' | 'empty' | 'error' | 'offline';
type QueueFilter = 'flagged' | 'all' | 'reported' | 'eligibility' | 'with_comment';
type ConfirmKind = 'hide' | 'note' | null;

type ReviewOverride = {
  status?: MockReview['status'];
  history?: MockReview['history'];
  flash?: string | null;
  commentHidden?: boolean;
};

function statusTone(s: MockReview['status']): StatusTone {
  if (s === 'Valid') return 'clear';
  if (s === 'Under review') return 'neutral';
  if (s === 'Eligibility anomaly') return 'risk';
  if (s === 'Duplicate anomaly') return 'hold';
  if (s === 'Hidden') return 'risk';
  return 'neutral';
}

function linkedPath(kind: MockReview['linkedRecords'][number]['kind']) {
  if (kind === 'report') return '/reports';
  if (kind === 'order') return '/orders';
  return '/users';
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            'size-4',
            i < rating ? 'fill-[#c4a35a] text-[#c4a35a]' : 'fill-transparent text-[#d4c8bc]',
          )}
        />
      ))}
    </div>
  );
}

export function ReviewsPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [queue, setQueue] = useState<QueueFilter>('flagged');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(mockReviews[0]?.id ?? null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [demoState, setDemoState] = useState<DemoState>('ready');
  const [overrides, setOverrides] = useState<Record<string, ReviewOverride>>({});
  const [noteDraft, setNoteDraft] = useState('');

  const canHide = session ? canAct(session.role, 'hide_review') : false;
  const isSupport = session?.role === 'support';
  const isFinance = session?.role === 'finance';

  const reviews = useMemo(
    () =>
      mockReviews.map((r) => {
        const o = overrides[r.id];
        if (!o) return r;
        return {
          ...r,
          status: o.status ?? r.status,
          history: o.history ?? r.history,
          comment: o.commentHidden ? '[comment hidden after human review]' : r.comment,
        };
      }),
    [overrides],
  );

  const flaggedCount = reviews.filter((r) => r.flagged || r.status === 'Under review').length;

  usePageChrome({
    title: 'Reviews',
    subtitle: `${flaggedCount} flagged · one review per Completed transaction, by the transaction buyer only`,
    search,
    onSearchChange: setSearch,
    searchPlaceholder: 'Review, seller or order',
    bleed: true,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      if (queue === 'flagged' && !(r.flagged || r.status === 'Under review')) return false;
      if (queue === 'reported' && !r.reported) return false;
      if (queue === 'eligibility' && !r.eligibilityAnomaly && !r.duplicateAnomaly) return false;
      if (queue === 'with_comment' && !r.hasComment) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.orderId.toLowerCase().includes(q) ||
        r.seller.toLowerCase().includes(q) ||
        r.buyer.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        r.commentSummary.toLowerCase().includes(q)
      );
    });
  }, [reviews, queue, search]);

  const selected = reviews.find((r) => r.id === selectedId) ?? null;
  const selectedFlash = selected ? overrides[selected.id]?.flash : null;
  const commentAlreadyHidden =
    selected?.status === 'Hidden' || Boolean(selected && overrides[selected.id]?.commentHidden);

  function patchReview(id: string, next: ReviewOverride) {
    setOverrides((current) => ({
      ...current,
      [id]: { ...current[id], ...next },
    }));
  }

  function appendHistory(review: MockReview, entry: MockReview['history'][number]): MockReview['history'] {
    return [entry, ...(overrides[review.id]?.history ?? review.history)];
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
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1.35fr)_minmax(360px,0.95fr)]">
        <div className="flex min-h-0 min-w-0 flex-col border-r border-[#dccfc4] bg-panel">
          <div className="space-y-3 border-b border-[#e7dcd2] px-4 py-4">
            <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
              Screen 12 preview states
            </div>
            <FilterChips
              tone="soft"
              value={demoState}
              onChange={(id) => setDemoState(id as DemoState)}
              options={[
                { id: 'ready', label: 'Ready' },
                { id: 'loading', label: 'Loading' },
                { id: 'empty', label: 'Empty' },
                { id: 'error', label: 'Error' },
                { id: 'offline', label: 'Offline' },
              ]}
            />
            <FilterChips
              value={queue}
              onChange={(id) => setQueue(id as QueueFilter)}
              options={[
                { id: 'flagged', label: 'Flagged', count: flaggedCount },
                { id: 'all', label: 'All reviews' },
                { id: 'reported', label: 'Reported' },
                { id: 'eligibility', label: 'Eligibility anomaly' },
                { id: 'with_comment', label: 'With comment' },
              ]}
            />
            {banner}
            {demoState === 'offline' ? <OfflineBanner onRetry={() => setDemoState('ready')} /> : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {demoState === 'loading' ? <LoadingState label="Loading reviews…" /> : null}

            {demoState === 'error' ? (
              <ErrorState
                title="Reviews could not load"
                description="Nothing was changed. Retry when the connection is stable."
                onRetry={() => setDemoState('ready')}
              />
            ) : null}

            {demoState === 'empty' || (demoState === 'ready' && rows.length === 0) ? (
              <EmptyState
                title={queue === 'flagged' ? 'No flagged reviews' : 'No reviews match'}
                description="Try a different filter or search."
                actionLabel="Reset filters"
                onAction={() => {
                  setQueue('flagged');
                  setSearch('');
                  setDemoState('ready');
                }}
              />
            ) : null}

            {(demoState === 'ready' || demoState === 'offline') && rows.length > 0 ? (
              <>
                <div className="sticky top-0 z-[1] grid grid-cols-[84px_minmax(0,0.85fr)_minmax(0,0.85fr)_88px_56px_minmax(0,1.4fr)_118px] border-b border-[#e7dcd2] bg-[#fbf5ef] px-4 py-2.5 text-[9.5px] font-semibold tracking-[0.13em] text-muted-2 uppercase">
                  <span>Review</span>
                  <span>Seller</span>
                  <span>Buyer</span>
                  <span>Order</span>
                  <span>Rating</span>
                  <span>Comment</span>
                  <span>Status</span>
                </div>
                {rows.map((r) => {
                  const active = r.id === selectedId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={demoState === 'offline'}
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        'grid w-full grid-cols-[84px_minmax(0,0.85fr)_minmax(0,0.85fr)_88px_56px_minmax(0,1.4fr)_118px] items-center border-b border-[#f0e7de] px-4 py-3 text-left last:border-0',
                        active ? 'bg-[#f9f1ea]' : 'bg-panel hover:bg-[#fbf5ef]',
                        demoState === 'offline' && 'opacity-60',
                      )}
                    >
                      <span className="font-mono text-[11px] font-semibold text-plum">{r.id}</span>
                      <span className="truncate text-[12px] text-espresso">@{r.seller}</span>
                      <span className="truncate text-[12px] text-espresso">@{r.buyer}</span>
                      <span className="font-mono text-[11px] text-body">{r.orderId}</span>
                      <span className="text-[12px] font-semibold tabular-nums text-espresso">
                        {r.rating} / 5
                      </span>
                      <span className="truncate pr-2 text-[12px] text-body">{r.commentSummary}</span>
                      <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
                    </button>
                  );
                })}
              </>
            ) : null}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col bg-panel">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center px-6 text-[12.5px] text-body">
              Select a review to inspect.
            </div>
          ) : demoState === 'error' ? (
            <div className="flex flex-1 flex-col justify-center gap-3 px-5">
              <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                <AlertTitle className="text-[12px] text-risk">Review could not load · nothing was changed</AlertTitle>
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-[26px] leading-none text-espresso">{selected.id}</div>
                    <p className="mt-2 text-[12.5px] leading-snug text-body">{selected.headerMeta}</p>
                  </div>
                  <StatusBadge tone={statusTone(selected.status)}>{selected.status}</StatusBadge>
                </div>
                <p className="mt-2 text-[11px] text-muted-2">
                  Lightweight review integrity and safety investigation
                </p>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-4">
                {selectedFlash ? (
                  <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                    <AlertTitle className="text-[12px] text-clear">Recorded</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-clear">{selectedFlash}</AlertDescription>
                  </Alert>
                ) : null}

                <AiAdvisory
                  kind="SUMMARY"
                  recommendation={
                    selected.aiNextStep ? <>Recommended: {selected.aiNextStep}</> : undefined
                  }
                >
                  {selected.aiSummary}
                </AiAdvisory>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                      Review content
                    </div>
                    <span className="text-[10.5px] font-semibold tracking-[0.08em] text-muted-2 uppercase">
                      Read-only
                    </span>
                  </div>
                  <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Stars rating={selected.rating} />
                      <span className="text-[12px] font-semibold tabular-nums text-espresso">
                        {selected.rating} / 5
                      </span>
                    </div>
                    {selected.hasComment ? (
                      <blockquote className="mt-3 text-[13px] leading-relaxed text-espresso">
                        “{selected.comment}”
                      </blockquote>
                    ) : (
                      <p className="mt-3 text-[12.5px] text-body">No written comment.</p>
                    )}
                    <p className="mt-3 text-[11px] leading-relaxed text-body">
                      Comment text cannot be edited by admins. Only the comment’s public display may change, after
                      authorised human review. Star ratings are never edited.
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Eligibility
                  </div>
                  <ul className="space-y-2 rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3 py-3">
                    {selected.eligibility.map((item) => (
                      <li key={item.label} className="flex items-start gap-2 text-[12.5px]">
                        <span
                          className={cn(
                            'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full',
                            item.ok ? 'bg-clear-bg text-clear' : 'bg-risk-bg text-risk',
                          )}
                        >
                          {item.ok ? <Check className="size-3" /> : <X className="size-3" />}
                        </span>
                        <span className={item.ok ? 'text-espresso' : 'font-semibold text-risk'}>
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Linked records
                  </div>
                  <div className="overflow-hidden rounded-[8px] border border-[#ebe3da]">
                    {selected.linkedRecords.map((r) => (
                      <div
                        key={`${r.kind}-${r.id}`}
                        className="flex items-center justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5 last:border-0"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-mono text-[11px] font-semibold text-espresso">{r.id}</div>
                          <div className="text-[11px] text-body">{r.label}</div>
                        </div>
                        <Link
                          to={linkedPath(r.kind)}
                          className="shrink-0 text-[11px] font-semibold text-plum hover:underline"
                        >
                          {r.openLabel}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Seller rating context
                  </div>
                  <div className="rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-4 py-3">
                    <div className="text-[18px] font-semibold tabular-nums text-espresso">
                      {selected.sellerAvg.toFixed(1)}{' '}
                      <span className="text-[12px] font-normal text-body">
                        from {selected.sellerReviewCount} reviews
                      </span>
                    </div>
                    <p className="mt-2 text-[11.5px] leading-relaxed text-body">{selected.sellerRatingNote}</p>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Action history
                  </div>
                  {selected.history.length === 0 ? (
                    <p className="text-[12px] text-body">No events yet.</p>
                  ) : (
                    <ul className="divide-y divide-[#ebe3da] rounded-[8px] border border-[#ebe3da] bg-[#fbf7f2] px-3">
                      {selected.history.map((event) => (
                        <li key={event.id} className="py-2.5 text-[12.5px] leading-snug text-espresso">
                          <span className="font-semibold">{event.title}</span>
                          <span className="text-body">
                            {' '}
                            · {event.at}
                            {event.detail ? ` · ${event.detail}` : ''}
                          </span>
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
                      Hide-comment controls are for Trust & Safety. Notes only on this screen.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <div className="border-t border-[#e7dcd2] bg-[#fbf7f2] px-5 py-4">
                <div className="mb-2.5 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                  Review actions · {session ? ROLE_LABELS[session.role] : 'Staff'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={demoState === 'offline'}
                    onClick={() => {
                      setNoteDraft('');
                      setConfirm('note');
                    }}
                  >
                    Add internal note
                  </Button>
                  {canHide && selected.hasComment && !commentAlreadyHidden ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-risk text-risk hover:bg-risk-bg"
                      disabled={demoState === 'offline'}
                      onClick={() => setConfirm('hide')}
                    >
                      Hide comment — rating retained
                    </Button>
                  ) : null}
                  {selected.reported ? (
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Link to="/reports">Open report</Link>
                    </Button>
                  ) : null}
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-body">
                  Admins never edit star ratings. Hiding only removes the comment from public view; the rating stays
                  and still counts.
                </p>
              </div>
            </>
          )}
        </aside>
      </div>

      {confirm === 'hide' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={`Hide comment on ${selected.id}?`}
          description={`The comment is removed from public view. The ${selected.rating}★ rating stays visible and still counts toward the seller average.`}
          confirmLabel="Hide comment"
          destructive
          requireCheckbox
          checkboxLabel="I have reviewed this comment and understand the rating will remain."
          reasonLabel="Reason (required, recorded)"
          reasonPlaceholder="Policy concern in the written comment…"
          metaRows={[
            { label: 'Affected object', value: `Review ${selected.id}` },
            { label: 'Rating', value: `${selected.rating} / 5 · retained` },
            { label: 'Audit entry', value: 'Created on confirm' },
          ]}
          onConfirm={(reason) => {
            const stamp = stampNow();
            const by = actorLabel();
            patchReview(selected.id, {
              status: 'Hidden',
              commentHidden: true,
              flash: `Comment hidden · ${by} · ${stamp}`,
              history: appendHistory(selected, {
                id: `hide-${Date.now()}`,
                at: stamp,
                title: 'Comment hidden',
                detail: `${by} · ${reason}`,
              }),
            });
            show(`Hidden comment on ${selected.id}`);
            setConfirm(null);
          }}
        />
      ) : null}

      {confirm === 'note' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title="Add internal note"
          description={`Note stays on ${selected.id}. Buyers and sellers never see this.`}
          confirmLabel="Save note"
          reasonLabel="Internal note"
          reasonPlaceholder="Context for the next reviewer…"
          defaultReason={noteDraft}
          onConfirm={(reason) => {
            const stamp = stampNow();
            const by = actorLabel();
            patchReview(selected.id, {
              flash: `Note saved · ${stamp}`,
              history: appendHistory(selected, {
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
    </>
  );
}
