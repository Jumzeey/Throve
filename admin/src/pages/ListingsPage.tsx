import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, roleLabel } from '@/auth/AuthContext';
import { AiAdvisory } from '@/components/admin/ai-advisory';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState, ErrorState, LoadingState, OfflineBanner } from '@/components/admin/empty-state';
import { FilterChips } from '@/components/admin/filter-chips';
import { StatusBadge, type StatusTone } from '@/components/admin/status-badge';
import { Timeline } from '@/components/admin/timeline';
import { usePageChrome } from '@/components/layout/shell-chrome';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatNaira, mockListings, type MockListing } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { ApiError, apiFetch } from '@/lib/api';
import { canAct, ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

type DemoState = 'ready' | 'loading' | 'empty' | 'error' | 'offline';
type ConfirmKind = 'remove' | 'restore' | 'note' | 'escalate' | 'approve' | 'reject' | null;
type QueueFilter =
  | 'pending'
  | 'rejected'
  | 'reported'
  | 'all'
  | 'available'
  | 'reserved'
  | 'sold'
  | 'hidden'
  | 'removed';

type ApiListing = {
  id: string;
  title: string;
  brand: string;
  price: number;
  size: string;
  condition: string;
  department: string;
  category: string;
  seller: string;
  status: string;
  description: string;
  shipping: string;
  photoCount: number;
  photoUrls: string[];
  createdAt: string;
  colour?: string;
  reviewSubmittedAt?: string;
  reviewReason?: string;
  reviewedAt?: string;
};

type ListingRow = {
  id: string;
  title: string;
  seller: string;
  department: string;
  category: string;
  condition: string;
  price: number;
  status: string;
  statusLabel: string;
  reports: number;
  photoCount: number;
  photoUrls: string[];
  description: string;
  brand: string;
  colour: string;
  updatedAt: string;
  reviewReason?: string;
  reviewSubmittedAt?: string;
  flagged?: boolean;
  linkedReports: MockListing['linkedReports'];
  history: MockListing['history'];
  aiSignal?: string;
  aiPriority?: string;
  aiNextStep?: string;
  reservedOrderId?: string | null;
  activeOrderId?: string | null;
  source: 'live' | 'mock';
};

type ListingOverride = {
  status?: string;
  history?: ListingRow['history'];
  flash?: string | null;
};

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending_review: 'Pending review',
    rejected: 'Rejected',
    available: 'Available',
    reserved: 'Reserved',
    sold: 'Sold',
    hidden: 'Hidden',
    removed: 'Removed',
    draft: 'Draft',
    Available: 'Available',
    Reserved: 'Reserved',
    Sold: 'Sold',
    Hidden: 'Hidden',
    Removed: 'Removed',
  };
  return map[status] ?? status;
}

function statusTone(s: string): StatusTone {
  const key = s.toLowerCase().replace(/\s+/g, '_');
  if (key === 'available') return 'clear';
  if (key === 'reserved' || key === 'pending_review') return 'hold';
  if (key === 'sold') return 'gold';
  if (key === 'removed' || key === 'rejected') return 'risk';
  if (key === 'hidden') return 'neutral';
  return 'neutral';
}

function isPendingStatus(status: string) {
  const key = status.toLowerCase().replace(/\s+/g, '_');
  return key === 'pending_review';
}

function isFlagged(l: ListingRow) {
  return Boolean(l.flagged) || l.reports > 0;
}

function fromApi(item: ApiListing): ListingRow {
  return {
    id: item.id,
    title: item.title,
    seller: item.seller,
    department: item.department,
    category: item.category,
    condition: item.condition,
    price: item.price,
    status: item.status,
    statusLabel: statusLabel(item.status),
    reports: 0,
    photoCount: item.photoCount,
    photoUrls: item.photoUrls ?? [],
    description: item.description,
    brand: item.brand,
    colour: item.colour ?? '—',
    updatedAt: item.reviewSubmittedAt?.slice(0, 16)?.replace('T', ' ') ?? item.createdAt,
    reviewReason: item.reviewReason,
    reviewSubmittedAt: item.reviewSubmittedAt,
    linkedReports: [],
    history: item.reviewSubmittedAt
      ? [
          {
            id: `sub-${item.id}`,
            at: item.reviewSubmittedAt.slice(0, 16).replace('T', ' '),
            title: 'Submitted for review',
            detail: 'Seller published · awaiting Trust & Safety',
          },
        ]
      : [],
    aiSignal: 'Pre-publish review queue. Check photos, category fit, prohibited items, and pricing signals.',
    source: 'live',
  };
}

function fromMock(item: MockListing): ListingRow {
  return {
    id: item.id,
    title: item.title,
    seller: item.seller,
    department: item.department,
    category: item.category,
    condition: item.condition,
    price: item.price,
    status: item.status,
    statusLabel: item.status,
    reports: item.reports,
    photoCount: item.photoCount,
    photoUrls: [],
    description: item.description,
    brand: item.brand,
    colour: item.colour,
    updatedAt: item.updatedAt,
    flagged: item.flagged,
    linkedReports: item.linkedReports,
    history: item.history,
    aiSignal: item.aiSignal,
    aiPriority: item.aiPriority,
    aiNextStep: item.aiNextStep,
    reservedOrderId: item.reservedOrderId,
    activeOrderId: item.activeOrderId,
    source: 'mock',
  };
}

export function ListingsPage() {
  const { session } = useAuth();
  const liveMode = Boolean(session?.accessToken);
  const { banner, show } = useToast();
  const [filter, setFilter] = useState<QueueFilter>('pending');
  const [dept, setDept] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [demoState, setDemoState] = useState<DemoState>(liveMode ? 'loading' : 'ready');
  const [overrides, setOverrides] = useState<Record<string, ListingOverride>>({});
  const [noteDraft, setNoteDraft] = useState('');
  const [liveListings, setLiveListings] = useState<ListingRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const canApprove = session ? canAct(session.role, 'approve_listing') : false;
  const canReject = session ? canAct(session.role, 'reject_listing') : false;
  const canModerate = session ? canAct(session.role, 'hide_listing') : false;
  const canRestore = session ? canAct(session.role, 'restore_listing') : false;
  const isSupport = session?.role === 'support';

  const loadLive = useCallback(async () => {
    if (!liveMode) return;
    setDemoState('loading');
    setLoadError(null);
    try {
      const queue = filter === 'reported' ? 'all' : filter;
      const q = encodeURIComponent(search.trim());
      const data = await apiFetch<{ listings: ApiListing[]; counts: { pending: number } }>(
        `/admin/listings?queue=${queue}&q=${q}`,
      );
      const mapped = data.listings.map(fromApi);
      setLiveListings(mapped);
      setPendingCount(data.counts.pending ?? 0);
      setSelectedId((current) => {
        if (current && mapped.some((l) => l.id === current)) return current;
        return mapped[0]?.id ?? null;
      });
      setDemoState(mapped.length === 0 ? 'empty' : 'ready');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not load listings';
      setLoadError(message);
      setDemoState('error');
    }
  }, [liveMode, filter, search]);

  useEffect(() => {
    if (!liveMode) {
      setDemoState('ready');
      setLiveListings([]);
      setPendingCount(reportedCount(mockListings.map(fromMock)));
      return;
    }
    void loadLive();
  }, [liveMode, loadLive]);

  const baseListings = useMemo(() => {
    if (liveMode) return liveListings;
    return mockListings.map(fromMock);
  }, [liveMode, liveListings]);

  const flagged = useMemo(() => baseListings.filter(isFlagged).length, [baseListings]);

  const demoPendingCount = useMemo(
    () => baseListings.filter((l) => isPendingStatus(l.status)).length,
    [baseListings],
  );

  usePageChrome({
    title: 'Listings',
    subtitle: liveMode
      ? `${pendingCount} pending review · moderation: Trust & Safety and Super Admin`
      : `${demoPendingCount} pending review · ${flagged} flagged · demo data`,
    search,
    onSearchChange: setSearch,
    searchPlaceholder: 'Listing, title or seller',
    bleed: true,
  });

  const listings = useMemo(
    () =>
      baseListings.map((l) => {
        const o = overrides[l.id];
        if (!o) return l;
        return {
          ...l,
          status: o.status ?? l.status,
          statusLabel: statusLabel(o.status ?? l.status),
          history: o.history ?? l.history,
        };
      }),
    [baseListings, overrides],
  );

  const rows = useMemo(() => {
    if (liveMode) {
      // Server already filtered by queue; apply local dept + reported only when needed
      const q = search.trim().toLowerCase();
      return listings.filter((l) => {
        if (filter === 'reported' && !isFlagged(l)) return false;
        if (dept !== 'all' && l.department.toLowerCase() !== dept) return false;
        if (!q) return true;
        return (
          l.title.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q) ||
          l.seller.toLowerCase().includes(q)
        );
      });
    }
    const q = search.trim().toLowerCase();
    return listings.filter((l) => {
      if (filter === 'pending' && l.status.toLowerCase() !== 'pending_review' && l.status !== 'Pending review') {
        return false;
      }
      if (filter === 'rejected' && l.status.toLowerCase() !== 'rejected') return false;
      if (filter === 'reported' && !isFlagged(l)) return false;
      if (filter === 'available' && l.status !== 'Available' && l.status !== 'available') return false;
      if (filter === 'reserved' && l.status !== 'Reserved' && l.status !== 'reserved') return false;
      if (filter === 'sold' && l.status !== 'Sold' && l.status !== 'sold') return false;
      if (filter === 'hidden' && l.status !== 'Hidden' && l.status !== 'hidden') return false;
      if (filter === 'removed' && l.status !== 'Removed' && l.status !== 'removed') return false;
      if (dept !== 'all' && l.department.toLowerCase() !== dept) return false;
      if (!q) return true;
      return (
        l.title.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        l.seller.toLowerCase().includes(q)
      );
    });
  }, [listings, filter, dept, search, liveMode]);

  const selected = listings.find((l) => l.id === selectedId) ?? null;
  const selectedFlash = selected ? overrides[selected.id]?.flash : null;
  const hasActiveTx = Boolean(selected?.reservedOrderId || selected?.activeOrderId);
  const isRemovedOrHidden =
    selected?.status === 'Removed' ||
    selected?.status === 'Hidden' ||
    selected?.status === 'removed' ||
    selected?.status === 'hidden';
  const isPending = selected ? isPendingStatus(selected.status) : false;

  function patchListing(id: string, next: ListingOverride) {
    setOverrides((current) => ({
      ...current,
      [id]: { ...current[id], ...next },
    }));
  }

  function appendHistory(listing: ListingRow, entry: ListingRow['history'][number]): ListingRow['history'] {
    return [entry, ...(overrides[listing.id]?.history ?? listing.history)];
  }

  async function approveSelected() {
    if (!selected) return;
    if (liveMode) {
      setActionBusy(true);
      try {
        await apiFetch(`/admin/listings/${selected.id}/approve`, { method: 'POST', body: '{}' });
        show(`Approved ${selected.id} · now live`);
        setConfirm(null);
        await loadLive();
      } catch (err) {
        show(err instanceof Error ? err.message : 'Approve failed');
      } finally {
        setActionBusy(false);
      }
      return;
    }
    const stamp = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const by = session ? `${session.name} (${roleLabel(session.role)})` : 'Staff';
    patchListing(selected.id, {
      status: 'Available',
      flash: `${selected.id} approved · now live`,
      history: appendHistory(selected, {
        id: `ap-${Date.now()}`,
        at: stamp,
        title: 'Approved · now live',
        detail: by,
        tone: 'ok',
      }),
    });
    show(`Approved ${selected.id}`);
    setConfirm(null);
  }

  async function rejectSelected(reason: string) {
    if (!selected) return;
    if (liveMode) {
      setActionBusy(true);
      try {
        await apiFetch(`/admin/listings/${selected.id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
        show(`Rejected ${selected.id}`);
        setConfirm(null);
        await loadLive();
      } catch (err) {
        show(err instanceof Error ? err.message : 'Reject failed');
      } finally {
        setActionBusy(false);
      }
      return;
    }
    const stamp = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const by = session ? `${session.name} (${roleLabel(session.role)})` : 'Staff';
    patchListing(selected.id, {
      status: 'Rejected',
      flash: `${selected.id} rejected · needs changes`,
      history: appendHistory(selected, {
        id: `rj-${Date.now()}`,
        at: stamp,
        title: 'Rejected · needs changes',
        detail: `${by} · ${reason}`,
        tone: 'danger',
      }),
    });
    show(`Rejected ${selected.id}`);
    setConfirm(null);
  }

  return (
    <>
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1.35fr)_minmax(360px,0.95fr)]">
        <div className="flex min-h-0 min-w-0 flex-col border-r border-[#dccfc4] bg-panel">
          <div className="space-y-3 border-b border-[#e7dcd2] px-4 py-4">
            {!liveMode ? (
              <>
                <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                  Demo preview states
                </div>
                <FilterChips
                  tone="soft"
                  value={demoState}
                  onChange={(id) => setDemoState(id as DemoState)}
                  options={[
                    { id: 'ready', label: 'Ready' },
                    { id: 'loading', label: 'Loading' },
                    { id: 'empty', label: 'No results' },
                    { id: 'error', label: 'Error' },
                    { id: 'offline', label: 'Offline' },
                  ]}
                />
              </>
            ) : (
              <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                Live queue · staff API
              </div>
            )}
            <FilterChips
              value={filter}
              onChange={(id) => setFilter(id as QueueFilter)}
              options={[
                { id: 'pending', label: 'Pending review', count: liveMode ? pendingCount : demoPendingCount },
                { id: 'rejected', label: 'Rejected' },
                { id: 'reported', label: 'Reported', count: flagged || undefined },
                { id: 'all', label: 'All listings' },
                { id: 'available', label: 'Available' },
                { id: 'reserved', label: 'Reserved' },
                { id: 'sold', label: 'Sold' },
                { id: 'hidden', label: 'Hidden' },
                { id: 'removed', label: 'Removed' },
              ]}
            />
            <FilterChips
              tone="soft"
              value={dept}
              onChange={setDept}
              options={[
                { id: 'all', label: 'Women · Men · Kids' },
                { id: 'women', label: 'Women' },
                { id: 'men', label: 'Men' },
                { id: 'kids', label: 'Kids' },
              ]}
            />
            {banner}
            {demoState === 'offline' ? <OfflineBanner onRetry={() => (liveMode ? void loadLive() : setDemoState('ready'))} /> : null}
            {loadError && liveMode ? (
              <Alert variant="destructive">
                <AlertTitle>Load failed</AlertTitle>
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {demoState === 'loading' ? <LoadingState label="Loading listings…" /> : null}

            {demoState === 'error' ? (
              <ErrorState
                title="Listing could not load"
                description="Nothing was changed. Retry when the connection is stable."
                onRetry={() => (liveMode ? void loadLive() : setDemoState('ready'))}
              />
            ) : null}

            {demoState === 'empty' || (demoState === 'ready' && rows.length === 0) ? (
              <EmptyState
                title={filter === 'pending' ? 'No listings pending review' : 'No listings match'}
                description={
                  filter === 'pending'
                    ? 'Seller publishes land here until Trust & Safety approves or rejects.'
                    : 'Try a different reference, title or seller.'
                }
                actionLabel="Reset filters"
                onAction={() => {
                  setFilter('pending');
                  setDept('all');
                  setSearch('');
                  if (!liveMode) setDemoState('ready');
                }}
              />
            ) : null}

            {(demoState === 'ready' || demoState === 'offline') && rows.length > 0 ? (
              <>
                <div className="sticky top-0 z-[1] grid grid-cols-[88px_minmax(0,1.4fr)_100px_118px_88px_108px_64px] border-b border-[#e7dcd2] bg-[#fbf5ef] px-4 py-2.5 text-[9.5px] font-semibold tracking-[0.13em] text-muted-2 uppercase">
                  <span>Listing</span>
                  <span>Item</span>
                  <span>Seller</span>
                  <span>Dept · category</span>
                  <span>Condition</span>
                  <span>Price / status</span>
                  <span>Reports</span>
                </div>
                {rows.map((l) => {
                  const active = l.id === selectedId;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      disabled={demoState === 'offline'}
                      onClick={() => setSelectedId(l.id)}
                      className={cn(
                        'grid w-full grid-cols-[88px_minmax(0,1.4fr)_100px_118px_88px_108px_64px] items-center border-b border-[#f0e7de] px-4 py-3 text-left last:border-0',
                        active ? 'bg-[#f9f1ea]' : 'bg-panel hover:bg-[#fbf5ef]',
                        demoState === 'offline' && 'opacity-60',
                      )}
                    >
                      <span className="truncate font-mono text-[11px] font-semibold text-espresso">{l.id.slice(0, 8)}</span>
                      <span className="flex min-w-0 items-center gap-2.5">
                        {l.photoUrls[0] ? (
                          <img
                            src={l.photoUrls[0]}
                            alt=""
                            className="size-9 shrink-0 rounded-[4px] border border-[#e2d7cc] object-cover"
                          />
                        ) : (
                          <span className="size-9 shrink-0 rounded-[4px] border border-[#e2d7cc] bg-[#efe6dd]" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] font-semibold text-espresso">{l.title}</span>
                          <span className="block truncate text-[10.5px] text-muted">{l.updatedAt}</span>
                        </span>
                      </span>
                      <span className="truncate text-[11.5px] text-body">@{l.seller}</span>
                      <span className="truncate text-[11px] text-body">
                        {l.department} · {l.category}
                      </span>
                      <span className="truncate text-[11px] text-body">{l.condition}</span>
                      <span className="flex flex-col items-start gap-1">
                        <span className="text-[11.5px] font-semibold tabular-nums text-espresso">
                          {formatNaira(l.price)}
                        </span>
                        <StatusBadge tone={statusTone(l.status)}>{l.statusLabel}</StatusBadge>
                      </span>
                      <span>
                        {l.reports > 0 ? (
                          <StatusBadge tone={l.reports >= 3 ? 'risk' : 'hold'}>{l.reports}</StatusBadge>
                        ) : (
                          <span className="text-[11px] text-muted-2">—</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </>
            ) : null}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col bg-panel">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center px-6 text-[12.5px] text-muted">
              Select a listing to inspect.
            </div>
          ) : demoState === 'error' ? (
            <div className="flex flex-1 flex-col justify-center gap-3 px-5">
              <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                <AlertTitle className="text-[12px] text-risk">Listing could not load</AlertTitle>
                <AlertDescription className="text-[11.5px] text-risk">
                  Nothing was changed.{' '}
                  <button type="button" className="font-semibold underline" onClick={() => void loadLive()}>
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
                    <div className="font-mono text-[11px] font-semibold text-muted">{selected.id}</div>
                    <div className="mt-0.5 font-display text-[20px] leading-tight text-espresso">{selected.title}</div>
                    <div className="mt-1 text-[11.5px] text-muted">@{selected.seller}</div>
                  </div>
                  <StatusBadge tone={statusTone(selected.status)}>{selected.statusLabel}</StatusBadge>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-4">
                {selectedFlash ? (
                  <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                    <AlertTitle className="text-[12px] text-clear">Action recorded</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-clear">{selectedFlash}</AlertDescription>
                  </Alert>
                ) : null}

                {isPending ? (
                  <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                    <AlertTitle className="text-[12px] text-[#8a5a15]">Awaiting pre-publish review</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-[#8a5a15]">
                      Not visible in the marketplace until approved. Followers are notified only after approve.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {selected.status === 'rejected' && selected.reviewReason ? (
                  <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                    <AlertTitle className="text-[12px] text-risk">Previously rejected</AlertTitle>
                    <AlertDescription className="text-[11.5px] text-risk">{selected.reviewReason}</AlertDescription>
                  </Alert>
                ) : null}

                {selected.aiSignal ? (
                  <AiAdvisory kind="SIGNAL">{selected.aiSignal}</AiAdvisory>
                ) : null}

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Photos · {selected.photoCount}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(selected.photoUrls.length
                      ? selected.photoUrls.slice(0, 4)
                      : Array.from({ length: Math.min(4, Math.max(1, selected.photoCount)) }).map(() => '')
                    ).map((url, i) =>
                      url ? (
                        <img
                          key={`${selected.id}-p-${i}`}
                          src={url}
                          alt=""
                          className="aspect-square rounded-[4px] border border-[#e2d7cc] object-cover"
                        />
                      ) : (
                        <div
                          key={`${selected.id}-ph-${i}`}
                          className="aspect-square rounded-[4px] border border-[#e2d7cc] bg-[#efe6dd]"
                        />
                      ),
                    )}
                  </div>
                </div>

                <div className="rounded-[5px] border border-[#e7dcd2] bg-[#fbf7f2] px-3.5 py-3">
                  <div className="text-[12.5px] font-semibold text-espresso">{selected.title}</div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-body">{selected.description}</p>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#e7dcd2] pt-3 text-[11.5px]">
                    <div>
                      <div className="text-[10px] text-muted-2 uppercase">Price</div>
                      <div className="font-semibold text-espresso">{formatNaira(selected.price)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-2 uppercase">Condition</div>
                      <div className="text-body">{selected.condition}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-2 uppercase">Department</div>
                      <div className="text-body">{selected.department}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-2 uppercase">Category</div>
                      <div className="text-body">{selected.category}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-2 uppercase">Brand</div>
                      <div className="text-body">{selected.brand}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-2 uppercase">Colour</div>
                      <div className="text-body">{selected.colour}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Linked records
                  </div>
                  <div className="overflow-hidden rounded-[5px] border border-[#e7dcd2]">
                    {selected.linkedReports.length === 0 ? (
                      <div className="px-3 py-2.5 text-[11.5px] text-muted">No linked reports</div>
                    ) : (
                      selected.linkedReports.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-3 border-b border-[#f0e7de] px-3 py-2.5 last:border-0"
                        >
                          <div>
                            <div className="font-mono text-[11px] font-semibold text-espresso">{r.id}</div>
                            <div className="text-[11px] text-muted">{r.label}</div>
                          </div>
                          <Link to="/reports" className="text-[11px] font-semibold text-plum hover:underline">
                            Open report
                          </Link>
                        </div>
                      ))
                    )}
                    <div className="flex items-center justify-between gap-3 border-t border-[#e7dcd2] bg-[#fbf5ef] px-3 py-2.5">
                      <div>
                        <div className="text-[10px] text-muted-2 uppercase">Seller account</div>
                        <div className="text-[12px] font-semibold text-espresso">@{selected.seller}</div>
                      </div>
                      <Link to="/users" className="text-[11px] font-semibold text-plum hover:underline">
                        Open user
                      </Link>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                    Review history
                  </div>
                  {selected.history.length === 0 ? (
                    <p className="text-[11.5px] text-muted">No review events yet.</p>
                  ) : (
                    <Timeline events={selected.history} />
                  )}
                </div>

                {isSupport ? (
                  <Alert className="rounded-[5px] border-dashed border-plum-border bg-plum-soft">
                    <Lock className="size-3.5 text-plum" />
                    <AlertTitle className="text-[11px] font-semibold text-plum">Customer Support</AlertTitle>
                    <AlertDescription className="text-[11px] text-[#5c3d4d]">
                      Notes and escalate only. Approve / reject require Trust & Safety or Super Admin.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <div className="border-t border-[#e7dcd2] bg-[#fbf7f2] px-5 py-4">
                <div className="mb-2.5 text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">
                  Moderation actions · {session ? ROLE_LABELS[session.role] : 'Staff'}
                </div>

                {isPending && (canApprove || canReject) ? (
                  <div className="mb-2.5 flex flex-wrap gap-2">
                    {canApprove ? (
                      <Button
                        type="button"
                        className="flex-1"
                        disabled={demoState === 'offline' || actionBusy}
                        onClick={() => setConfirm('approve')}
                      >
                        Approve · go live
                      </Button>
                    ) : null}
                    {canReject ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-risk text-risk hover:bg-risk-bg"
                        disabled={demoState === 'offline' || actionBusy}
                        onClick={() => setConfirm('reject')}
                      >
                        Reject · needs changes
                      </Button>
                    ) : null}
                  </div>
                ) : null}

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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={demoState === 'offline'}
                    onClick={() => setConfirm('escalate')}
                  >
                    {isSupport ? 'Escalate to T&S' : 'Escalate seller risk'}
                  </Button>
                </div>

                {!liveMode && canModerate && !isRemovedOrHidden ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2.5 w-full border-risk text-risk hover:bg-risk-bg"
                    disabled={demoState === 'offline'}
                    onClick={() => setConfirm('remove')}
                  >
                    Remove from public marketplace — requires reason
                  </Button>
                ) : null}

                {!liveMode && canRestore && isRemovedOrHidden ? (
                  <Button
                    type="button"
                    className="mt-2.5 w-full"
                    disabled={demoState === 'offline'}
                    onClick={() => setConfirm('restore')}
                  >
                    Restore visibility — requires reason
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </aside>
      </div>

      {confirm === 'approve' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title={`Approve ${selected.id} and publish live?`}
          description="Seller is notified that the listing is live. Followers of this seller are notified next."
          confirmLabel={actionBusy ? 'Approving…' : 'Approve listing'}
          reasonLabel="Optional note (not required)"
          reasonPlaceholder="Optional internal context…"
          reasonOptional
          onConfirm={() => {
            void approveSelected();
          }}
        />
      ) : null}

      {confirm === 'reject' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && !actionBusy && setConfirm(null)}
          title={`Reject ${selected.id}?`}
          description="Seller sees this reason and must edit then resubmit. The listing stays off the marketplace."
          confirmLabel={actionBusy ? 'Rejecting…' : 'Reject listing'}
          destructive
          reasonLabel="Reason for seller (required)"
          reasonPlaceholder="Photos unclear / category mismatch / prohibited item…"
          onConfirm={(reason) => {
            void rejectSelected(reason);
          }}
        />
      ) : null}

      {confirm === 'remove' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={`Remove ${selected.id} from the public marketplace?`}
          description={
            hasActiveTx
              ? `Warning: reserved order may be in progress. Visibility change does not cancel the order.`
              : 'The listing will no longer be publicly available.'
          }
          confirmLabel="Remove from marketplace"
          destructive
          reasonLabel="Reason (required, recorded)"
          reasonPlaceholder="Potential prohibited item — pending Trust & Safety assessment"
          onConfirm={(reason) => {
            const stamp = new Date().toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });
            const by = session ? `${session.name} (${roleLabel(session.role)})` : 'Staff';
            patchListing(selected.id, {
              status: 'Removed',
              flash: `${selected.id} · ${by} · ${stamp}`,
              history: appendHistory(selected, {
                id: `rm-${Date.now()}`,
                at: stamp,
                title: 'Removed from public marketplace',
                detail: `${by} · ${reason}`,
                tone: 'danger',
              }),
            });
            show(`Removed ${selected.id}`);
            setConfirm(null);
          }}
        />
      ) : null}

      {confirm === 'restore' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={`Restore visibility for ${selected.id}?`}
          description="The listing will become publicly available again."
          confirmLabel="Restore visibility"
          reasonLabel="Reason (required, recorded)"
          reasonPlaceholder="Seller provided provenance / reports dismissed…"
          onConfirm={(reason) => {
            const stamp = new Date().toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });
            const by = session ? `${session.name} (${roleLabel(session.role)})` : 'Staff';
            patchListing(selected.id, {
              status: 'Available',
              flash: null,
              history: appendHistory(selected, {
                id: `rs-${Date.now()}`,
                at: stamp,
                title: 'Visibility restored',
                detail: `${by} · ${reason}`,
                tone: 'ok',
              }),
            });
            show(`Restored ${selected.id}`);
            setConfirm(null);
          }}
        />
      ) : null}

      {confirm === 'note' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title="Add internal note"
          description={`Note stays on ${selected.id}. Sellers and buyers never see this.`}
          confirmLabel="Save note"
          reasonLabel="Internal note"
          reasonPlaceholder="Context for the next reviewer…"
          defaultReason={noteDraft}
          onConfirm={(reason) => {
            const stamp = new Date().toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });
            const by = session ? `${session.name} (${roleLabel(session.role)})` : 'Staff';
            patchListing(selected.id, {
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

      {confirm === 'escalate' && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={isSupport ? 'Escalate to Trust & Safety' : 'Escalate seller risk'}
          description={
            isSupport
              ? `Route ${selected.id} / @${selected.seller} to Trust & Safety for enforcement review.`
              : `Raise seller risk on @${selected.seller} linked to ${selected.id}.`
          }
          confirmLabel="Escalate"
          reasonLabel="Escalation reason"
          reasonPlaceholder="Why this needs elevated review…"
          onConfirm={(reason) => {
            const stamp = new Date().toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });
            const by = session ? `${session.name} (${roleLabel(session.role)})` : 'Staff';
            patchListing(selected.id, {
              history: appendHistory(selected, {
                id: `es-${Date.now()}`,
                at: stamp,
                title: isSupport ? 'Escalated to Trust & Safety' : 'Seller risk escalated',
                detail: `${by} · ${reason}`,
                tone: 'warn',
              }),
            });
            show(isSupport ? 'Escalated to T&S' : 'Seller risk escalated');
            setConfirm(null);
          }}
        />
      ) : null}
    </>
  );
}

function reportedCount(list: ListingRow[]) {
  return list.filter(isFlagged).length;
}
