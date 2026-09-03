import { useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { AiAdvisory } from '@/components/admin/ai-advisory';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { FilterChips } from '@/components/admin/filter-chips';
import { StatusBadge } from '@/components/admin/status-badge';
import { usePageChrome } from '@/components/layout/shell-chrome';
import { Button } from '@/components/ui/button';
import { mockUsers, type MockUser } from '@/data/mock';
import { useToast } from '@/hooks/use-toast';
import { canAct, canViewPayoutFields, ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';

function statusTone(s: MockUser['status']) {
  if (s === 'Active') return 'clear' as const;
  if (s === 'Restricted') return 'hold' as const;
  if (s === 'Deactivated') return 'neutral' as const;
  return 'risk' as const;
}

function payoutTone(u: MockUser) {
  if (!u.seller) return null;
  if (u.kycStatus === 'Verified' && u.payoutVerified) return 'clear' as const;
  if (u.kycStatus === 'Pending') return 'hold' as const;
  return 'risk' as const;
}

function payoutLabel(u: MockUser) {
  if (!u.seller) return 'Not applicable';
  if (u.kycStatus === 'Verified' && u.payoutVerified) return 'Approved';
  if (u.kycStatus === 'Pending') return 'Pending';
  if (u.kycStatus === 'Rejected' || u.kycStatus === 'Failed') return 'Rejected';
  return 'None';
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function isHighRisk(u: MockUser) {
  return u.flags >= 3 || u.relatedReports.length >= 3 || u.relatedDisputes.length >= 2;
}

type ConfirmKind = 'note' | 'escalate' | 'restrict' | 'suspend' | 'ban' | 'approve_host' | null;

export function UsersPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(mockUsers[0]?.id ?? null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [loading, setLoading] = useState(false);
  const [dismissedStale, setDismissedStale] = useState<Record<string, boolean>>({});

  usePageChrome({
    title: 'Users',
    subtitle: 'Account investigation · 12,481 accounts',
    search,
    onSearchChange: setSearch,
    searchPlaceholder: 'Search username, email, or user ID…',
    bleed: true,
  });

  const role = session?.role;
  const isSuper = role === 'super_admin';
  const isTrust = role === 'trust_safety';
  const isSupport = role === 'support';
  const canEnforce = role ? canAct(role, 'suspend_user') : false;
  const canApproveHost = role ? canAct(role, 'approve_live_host') : false;
  const seePayout = role ? canViewPayoutFields(role) : false;

  useEffect(() => {
    setLoading(true);
    const id = window.setTimeout(() => setLoading(false), 320);
    return () => window.clearTimeout(id);
  }, [filter, search]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockUsers.filter((u) => {
      if (filter === 'flagged' && u.flags <= 0) return false;
      if (filter === 'restricted' && !(u.status === 'Restricted' || u.status === 'Suspended')) return false;
      if (filter === 'sellers' && !u.seller) return false;
      if (filter === 'hosts' && u.liveHost === 'None') return false;
      if (filter === 'kyc' && !(u.kycStatus === 'Pending' || u.kycStatus === 'Failed' || u.kycStatus === 'Rejected')) {
        return false;
      }
      if (!q) return true;
      return (
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    });
  }, [filter, search]);

  const selected = mockUsers.find((u) => u.id === selectedId) ?? null;
  const showStale = Boolean(selected?.recordStale && !dismissedStale[selected.id]);
  const actionsLabel = role ? ROLE_LABELS[role] : 'Staff';

  const confirmCopy: Record<Exclude<ConfirmKind, null>, { title: string; description: string; label: string }> = {
    note: {
      title: 'Add internal note',
      description: `Record an internal note on @${selected?.username}. Visible to staff only.`,
      label: 'Add note',
    },
    escalate: {
      title: isSupport ? 'Escalate to Trust & Safety' : 'Escalate account',
      description: isSupport
        ? `Escalate @${selected?.username} to Trust & Safety for review.`
        : `Escalate @${selected?.username} for further review.`,
      label: isSupport ? 'Escalate to T&S' : 'Escalate',
    },
    restrict: {
      title: 'Restrict account',
      description: `Limit selling and Live for @${selected?.username}. Buyer access may remain.`,
      label: 'Restrict account',
    },
    suspend: {
      title: 'Suspend account',
      description: `Temporarily block @${selected?.username} from the marketplace.`,
      label: 'Suspend account',
    },
    ban: {
      title: isSuper ? `Permanently ban @${selected?.username}?` : 'Recommend permanent ban',
      description: isSuper
        ? ''
        : `Permanent ban is executed by Super Admin. Trust & Safety records a recommendation with reason; no executable ban control is shown to this role.`,
      label: isSuper ? 'Permanently ban' : 'Recommend ban',
    },
    approve_host: {
      title: 'Approve live host',
      description: `Grant Live hosting to @${selected?.username}.`,
      label: 'Approve host',
    },
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChips
            tone="soft"
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: 'All accounts' },
              { id: 'flagged', label: 'Flagged' },
              { id: 'restricted', label: 'Restricted / suspended' },
              { id: 'sellers', label: 'Sellers' },
              { id: 'hosts', label: 'Live hosts' },
              { id: 'kyc', label: 'KYC pending' },
            ]}
          />
          <span className="ml-auto text-[11px] tabular-nums text-muted">{loading ? '…' : `${rows.length} results`}</span>
        </div>

        {banner}

        {loading ? (
          <div className="overflow-hidden rounded-[6px] border border-[#e7dcd2] bg-panel">
            <div className="border-b border-[#e7dcd2] bg-[#fbf5ef] px-4 py-2.5 text-[11px] font-semibold text-[#8c7a73]">
              Loading results
            </div>
            <div className="flex flex-col gap-3 px-4 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="size-[30px] animate-pulse rounded-full bg-[#e7dcd2]" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="h-2.5 w-[38%] animate-pulse rounded bg-[#e7dcd2]" />
                    <div className="h-2 w-[52%] animate-pulse rounded bg-[#f0e7de]" />
                  </div>
                  <div className="h-5 w-16 animate-pulse rounded bg-[#f0e7de]" />
                </div>
              ))}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[6px] border border-border-soft bg-panel">
            <EmptyState
              title="No accounts found"
              description={
                search
                  ? `Nothing matches “${search}”. Check the spelling or search by email or order reference.`
                  : 'No accounts match the current filters.'
              }
              actionLabel="Clear filters"
              onAction={() => {
                setFilter('all');
                setSearch('');
              }}
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-[6px] border border-[#e7dcd2] bg-panel">
            <div className="grid grid-cols-[1fr_116px_122px_128px_108px_74px] border-b border-[#e7dcd2] bg-[#fbf5ef] px-4 py-2.5 text-[9.5px] font-semibold tracking-[0.13em] text-[#8c7a73] uppercase">
              <span>Account</span>
              <span>Status</span>
              <span>Seller</span>
              <span>Payout verif.</span>
              <span>Live host</span>
              <span>Flags</span>
            </div>
            <div className="max-h-[calc(100vh-220px)] overflow-auto">
              {rows.map((u) => {
                const active = u.id === selectedId;
                const pt = payoutTone(u);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedId(u.id)}
                    className={cn(
                      'grid w-full grid-cols-[1fr_116px_122px_128px_108px_74px] items-center border-b border-[#f0e7de] px-4 py-3 text-left last:border-0',
                      active ? 'bg-[#f9f1ea]' : 'bg-panel hover:bg-[#fbf5ef]',
                      u.status === 'Banned' && 'opacity-70',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full border border-[#d4c7be] bg-[#e7dcd2] text-[10px] font-semibold text-body">
                        {initials(u.name)}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[12.5px] font-semibold text-espresso">@{u.username}</span>
                        <span className="truncate text-[11px] text-muted">
                          {u.status === 'Suspended'
                            ? `Suspended · ${u.name}`
                            : u.status === 'Banned'
                              ? 'Banned · by Super Admin'
                              : u.status === 'Deactivated'
                                ? `${u.name} · deactivated by user`
                                : `${u.name} · joined ${u.joined}`}
                        </span>
                      </span>
                    </span>
                    <span>
                      <StatusBadge
                        tone={statusTone(u.status)}
                        className={u.status === 'Banned' ? 'border-[#9e2b2b] bg-[#9e2b2b] text-panel' : undefined}
                      >
                        {u.status}
                      </StatusBadge>
                    </span>
                    <span className={cn('text-[11.5px]', u.seller ? 'text-body' : 'text-[#8c7a73]')}>
                      {u.seller ? `Seller · ${u.ordersSold} sales` : 'Buyer only'}
                    </span>
                    <span>
                      {pt ? (
                        <StatusBadge tone={pt}>{payoutLabel(u)}</StatusBadge>
                      ) : (
                        <span className="text-[11.5px] text-[#8c7a73]">Not applicable</span>
                      )}
                    </span>
                    <span>
                      {u.liveHost === 'Approved' || u.liveHost === 'Pending' ? (
                        <StatusBadge tone={u.liveHost === 'Approved' ? 'plum' : 'hold'}>
                          {u.liveHost === 'Approved' ? 'Approved' : 'Pending'}
                        </StatusBadge>
                      ) : (
                        <span className="text-[11.5px] text-[#8c7a73]">Not approved</span>
                      )}
                    </span>
                    <span>
                      {u.flags > 0 ? (
                        <StatusBadge tone={u.flags >= 4 ? 'risk' : 'hold'}>{u.flags}</StatusBadge>
                      ) : (
                        <span className="text-[11.5px] text-[#8c7a73]">—</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <aside className="flex w-[412px] shrink-0 flex-col border-l border-[#dccfc4] bg-panel">
        {selected ? (
          <>
            <div className="border-b border-[#e7dcd2] px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex size-[46px] shrink-0 items-center justify-center rounded-full border border-[#d4c7be] bg-[#e7dcd2] text-[13px] font-semibold text-body">
                  {initials(selected.name)}
                </span>
                <div className="min-w-0">
                  <div className="font-display text-[20px] leading-tight text-espresso">@{selected.username}</div>
                  <div className="mt-1 text-[11.5px] text-muted">
                    {selected.name}
                    {selected.location ? ` · ${selected.location}` : ''} · joined {selected.joined}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <StatusBadge tone={statusTone(selected.status)}>{selected.status}</StatusBadge>
                {selected.liveHost === 'Approved' ? <StatusBadge tone="plum">Live host approved</StatusBadge> : null}
                {selected.seller && selected.payoutVerified ? (
                  <StatusBadge tone="clear">Payout verification approved</StatusBadge>
                ) : null}
                {selected.flags > 0 ? (
                  <StatusBadge tone="risk">
                    {selected.flags} safety flag{selected.flags === 1 ? '' : 's'}
                  </StatusBadge>
                ) : null}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto px-5 py-4">
              {showStale && selected.recordStale ? (
                <div className="rounded-[5px] border border-[#e0b87a] bg-[#fbf3e6] px-3 py-2.5">
                  <div className="text-[12px] font-semibold text-[#8a5a15]">Record changed by another admin</div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[#8a5a15]">
                    This account was updated {selected.recordStale.at}. {selected.recordStale.by}{' '}
                    {selected.recordStale.action} while you were reviewing.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2.5 h-8 border-[#d4a574] text-[11.5px] text-[#8a5a15]"
                    onClick={() => setDismissedStale((prev) => ({ ...prev, [selected.id]: true }))}
                  >
                    Reload record
                  </Button>
                </div>
              ) : null}

              {selected.actionAlreadyApplied ? (
                <div className="rounded-[5px] border border-[#9fbfa8] bg-[#eef6f0] px-3 py-2.5">
                  <div className="text-[12px] font-semibold text-[#2f6b45]">
                    {selected.actionAlreadyApplied.action} already applied
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[#2f6b45]">
                    Applied by {selected.actionAlreadyApplied.by} at {selected.actionAlreadyApplied.at}. No further action
                    taken.
                  </p>
                </div>
              ) : null}

              {isHighRisk(selected) ? (
                <div className="rounded-[5px] border border-[#e4b4b4] bg-[#fbf0f0] px-3 py-2.5">
                  <div className="text-[12px] font-semibold text-[#8a2323]">High-risk linkage</div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[#8a2323]">
                    {selected.relatedReports.length} linked report{selected.relatedReports.length === 1 ? '' : 's'}
                    {selected.relatedDisputes.length
                      ? ` · ${selected.relatedDisputes.length} open dispute${selected.relatedDisputes.length === 1 ? '' : 's'}`
                      : ''}
                    . Flagged for Trust & Safety review before any payout-related action proceeds.
                  </p>
                </div>
              ) : null}

              {!isSupport ? <AiAdvisory>{selected.aiSummary}</AiAdvisory> : null}

              {isSupport ? (
                <div className="rounded-[5px] border border-[#e7dcd2] p-3">
                  <div className="text-[9.5px] font-semibold tracking-[0.12em] text-[#8c7a73] uppercase">Support context</div>
                  <div className="mt-1.5 text-[13px] font-semibold text-espresso">
                    {selected.status} · {selected.ordersSold} sold
                    {selected.relatedDisputes.length
                      ? ` · ${selected.relatedDisputes.length} open dispute${selected.relatedDisputes.length === 1 ? '' : 's'}`
                      : ''}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    Sales and dispute history visible for support work. Enforcement controls stay with Trust & Safety.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      label: 'Listings',
                      value: `${selected.listingsActive} active${
                        selected.listingsHidden ? ` · ${selected.listingsHidden} hidden` : ''
                      } · ${selected.ordersSold} sold`,
                    },
                    {
                      label: 'Orders',
                      value: `${selected.ordersSold} sold · ${selected.ordersBought ?? 0} bought${
                        selected.relatedDisputes.length ? ` · ${selected.relatedDisputes.length} open dispute` : ''
                      }`,
                    },
                    {
                      label: 'Reviews',
                      value:
                        selected.reviewAvg != null
                          ? `${selected.reviewAvg} average · ${selected.reviewCount ?? 0} reviews`
                          : 'No reviews yet',
                    },
                    {
                      label: 'Live',
                      value:
                        selected.liveHost === 'Approved'
                          ? `Host approved · ${selected.streams} streams`
                          : selected.liveHost === 'Pending'
                            ? 'Host pending approval'
                            : 'Not a live host',
                    },
                  ].map((c) => (
                    <div key={c.label} className="rounded-[5px] border border-[#e7dcd2] px-3 py-2.5">
                      <div className="text-[9.5px] font-semibold tracking-[0.12em] text-[#8c7a73] uppercase">{c.label}</div>
                      <div className="mt-1 text-[12.5px] text-espresso">{c.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {selected.relatedReports.length > 0 || selected.relatedDisputes.length > 0 ? (
                <div className="overflow-hidden rounded-[5px] border border-[#e7dcd2]">
                  <div className="border-b border-[#e7dcd2] bg-[#fbf5ef] px-3 py-2.5 text-[11.5px] font-semibold text-espresso">
                    Related reports & disputes
                  </div>
                  {[
                    ...selected.relatedDisputes.map((d) => ({ id: d, kind: 'dispute' as const })),
                    ...selected.relatedReports.map((r) => ({ id: r, kind: 'report' as const })),
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 border-b border-[#f0e7de] px-3 py-2.5 last:border-0"
                    >
                      <span className="text-[11.5px] text-espresso">{item.id}</span>
                      <StatusBadge tone={item.kind === 'dispute' ? 'hold' : 'neutral'}>
                        {item.kind === 'dispute' ? 'Under review' : 'Closed'}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="rounded-[5px] border border-[#e7dcd2] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold text-espresso">Payout verification</span>
                  <span className="text-[9.5px] font-semibold tracking-[0.1em] text-[#8c7a73] uppercase">Role-restricted</span>
                </div>
                {seePayout ? (
                  <>
                    <div className="flex justify-between py-1">
                      <span className="text-[11.5px] text-muted">Status</span>
                      <span className="text-[11.5px] text-espresso">{payoutLabel(selected)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-[11.5px] text-muted">Payout destination</span>
                      <span className="text-[11.5px] tabular-nums text-espresso">{selected.payoutAccountMasked}</span>
                    </div>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-[#8c7a73]">
                      Raw bank credentials are not displayed. Provider-managed or tokenised payout references are used where
                      available.
                    </p>
                  </>
                ) : (
                  <div className="rounded border border-dashed border-[#dccfc4] bg-[#fbf5ef] px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <Lock className="mt-0.5 size-3.5 shrink-0 text-[#8c7a73]" strokeWidth={1.75} />
                      <div>
                        <div className="text-[11.5px] font-semibold text-espresso">Payout & verification details restricted</div>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted">
                          Item required for support work — identity documents and payout destinations are never shown to this
                          role.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!isSupport ? (
                <div className="rounded-[5px] border border-[#e7dcd2] p-3">
                  <div className="mb-2 text-[11.5px] font-semibold text-espresso">Moderation & action history</div>
                  {selected.history.map((h, i) => (
                    <div key={i} className="border-t border-[#f0e7de] py-2">
                      <div className="text-[11.5px] text-espresso">{h.text}</div>
                      <div className="mt-0.5 text-[10.5px] text-muted">{h.at}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[5px] border border-dashed border-[#dccfc4] bg-[#fbf5ef] px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <Lock className="mt-0.5 size-3.5 shrink-0 text-[#8c7a73]" strokeWidth={1.75} />
                    <div>
                      <div className="text-[11.5px] font-semibold text-espresso">Moderation history restricted</div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted">
                        Full enforcement history stays with Trust & Safety. Support can escalate when needed.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#dccfc4] bg-[#fbf5ef] px-5 py-3.5">
              <div className="mb-2.5 text-[9.5px] font-semibold tracking-[0.13em] text-[#8c7a73] uppercase">
                Actions · {actionsLabel}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-auto border-plum py-2.5 text-[12px] font-semibold text-plum"
                  onClick={() => setConfirm('note')}
                >
                  Add internal note
                </Button>
                <Button
                  variant="outline"
                  className="h-auto border-[#dccfc4] py-2.5 text-[12px] font-semibold text-espresso"
                  onClick={() => setConfirm('escalate')}
                >
                  {isSupport ? 'Escalate to T&S' : 'Escalate'}
                </Button>
                {canApproveHost && selected.liveHost === 'Pending' ? (
                  <Button className="col-span-2 h-auto py-2.5 text-[12px] font-semibold" onClick={() => setConfirm('approve_host')}>
                    Approve live host
                  </Button>
                ) : null}
                {canEnforce ? (
                  <>
                    <Button
                      variant="outline"
                      className="h-auto border-[#b4762a] py-2.5 text-[12px] font-semibold text-[#8a5a15]"
                      onClick={() => setConfirm('restrict')}
                      disabled={Boolean(selected.actionAlreadyApplied)}
                    >
                      Restrict account
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto border-[#b4762a] py-2.5 text-[12px] font-semibold text-[#8a5a15]"
                      onClick={() => setConfirm('suspend')}
                      disabled={Boolean(selected.actionAlreadyApplied) || selected.status === 'Suspended'}
                    >
                      Suspend account
                    </Button>
                    <Button
                      variant="outline"
                      className={cn(
                        'col-span-2 h-auto py-2.5 text-[12px] font-semibold',
                        isSuper
                          ? 'border-[#9e2b2b] bg-[#f7ecec] text-[#8a2323]'
                          : 'border-dashed border-[#9e2b2b] text-[#8a2323]',
                      )}
                      onClick={() => setConfirm('ban')}
                      disabled={selected.status === 'Banned'}
                    >
                      {isSuper ? 'Permanently ban — requires confirmation' : 'Recommend permanent ban'}
                    </Button>
                  </>
                ) : null}
              </div>
              <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#8c7a73]">
                {isSupport
                  ? 'Restriction, suspension and ban controls are hidden for this role rather than shown disabled.'
                  : isTrust
                    ? 'Permanent ban is executed by Super Admin. Trust & Safety records a recommendation with reason; no executable ban control is shown to this role.'
                    : 'Every action above is recorded with acting admin, timestamp and reason.'}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-[12px] text-muted">Select an account to inspect.</div>
        )}
      </aside>

      {confirm && selected ? (
        <ConfirmActionDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={confirmCopy[confirm].title}
          description={confirmCopy[confirm].description}
          confirmLabel={confirmCopy[confirm].label}
          destructive={confirm === 'ban' || confirm === 'suspend'}
          requireCheckbox={confirm === 'ban' || confirm === 'suspend'}
          checkboxLabel={
            confirm === 'ban' && isSuper
              ? 'I have reviewed the case history and confirm this ban.'
              : undefined
          }
          reasonLabel={confirm === 'ban' ? 'Reason (recorded in audit log)' : undefined}
          defaultReason={confirm === 'ban' && isSuper ? selected.banRecommendation?.reason ?? '' : ''}
          metaRows={
            confirm === 'ban' && isSuper && selected.banRecommendation
              ? [
                  {
                    label: 'Recommended by',
                    value: `${selected.banRecommendation.by} · ${selected.banRecommendation.role}`,
                  },
                ]
              : undefined
          }
          onConfirm={(reason) => {
            show(`${confirmCopy[confirm].label} recorded for @${selected.username} · ${reason.slice(0, 40)}`);
            setConfirm(null);
          }}
        />
      ) : null}
    </div>
  );
}
