import { NavLink } from 'react-router-dom';
import {
  ClipboardList,
  Disc3,
  FileWarning,
  Gavel,
  LayoutDashboard,
  Package,
  Receipt,
  RefreshCcw,
  ScrollText,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth, roleLabel } from '../../auth/AuthContext';
import { mockBadgeCounts } from '../../data/mock';
import { navItemsFor, ROUTE_PATHS, type AdminRoute } from '../../lib/roles';
import { cn } from '@/lib/utils';

const LABELS: Record<AdminRoute, string> = {
  operations: 'Operations',
  users: 'Users',
  listings: 'Listings',
  reports: 'Reports',
  live: 'Live',
  orders: 'Orders',
  disputes: 'Disputes',
  payments: 'Payments',
  refunds: 'Refunds',
  payouts: 'Payouts',
  reviews: 'Reviews',
  audit: 'Audit log',
};

const ICONS: Record<AdminRoute, typeof LayoutDashboard> = {
  operations: LayoutDashboard,
  users: Users,
  listings: Package,
  reports: FileWarning,
  live: Disc3,
  orders: ClipboardList,
  disputes: Gavel,
  payments: Wallet,
  refunds: RefreshCcw,
  payouts: Receipt,
  reviews: Star,
  audit: ScrollText,
};

const BADGES: Partial<Record<AdminRoute, number>> = {
  listings: mockBadgeCounts.listings,
  reports: mockBadgeCounts.reports,
  live: mockBadgeCounts.live,
  disputes: mockBadgeCounts.disputes,
  refunds: mockBadgeCounts.refunds,
};

/** Hi-Fi order: single Operations section, flat list. */
const NAV_ORDER: AdminRoute[] = [
  'operations',
  'users',
  'listings',
  'reports',
  'live',
  'orders',
  'disputes',
  'payments',
  'refunds',
  'payouts',
  'reviews',
  'audit',
];

export function Sidebar() {
  const { session, signOut } = useAuth();
  if (!session) return null;
  const allowed = new Set(navItemsFor(session.role));
  const items = NAV_ORDER.filter((route) => allowed.has(route));

  return (
    <aside className="flex h-full w-[236px] shrink-0 flex-col bg-sidebar text-panel">
      <div className="border-b border-white/10 px-[22px] pb-[22px] pt-5">
        <div className="font-display text-[23px] leading-none text-panel">throve</div>
        <div className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-gold">Admin console</div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto py-4">
        <div className="px-[22px] pb-2 pt-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[rgba(255,247,240,0.38)]">
          Operations
        </div>
        <div className="flex flex-col">
          {items.map((route) => {
            const Icon = ICONS[route];
            return (
              <NavLink
                key={route}
                to={ROUTE_PATHS[route]}
                end={route === 'operations'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between gap-2 border-l-2 py-2.5 pr-3 pl-[20px] text-[12.5px] transition',
                    isActive
                      ? 'rounded-[4px] border-gold bg-[rgba(255,247,240,0.09)] font-semibold text-panel'
                      : 'border-transparent text-[rgba(255,247,240,0.72)] hover:bg-[rgba(255,247,240,0.05)] hover:text-panel',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon
                        className={cn('size-[15px] shrink-0', isActive ? 'text-panel' : 'text-[rgba(255,247,240,0.55)]')}
                        strokeWidth={1.7}
                      />
                      <span className="truncate">{LABELS[route]}</span>
                    </span>
                    {BADGES[route] ? (
                      <span className="rounded-[3px] bg-gold px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-[#241c1a]">
                        {BADGES[route]}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 px-[22px] py-4">
        <div className="text-[10.5px] leading-relaxed text-[rgba(255,247,240,0.42)]">Signed in as</div>
        <div className="mt-0.5 text-[12.5px] font-semibold text-panel">{session.name}</div>
        <div className="mt-0.5 text-[10.5px] text-gold">{roleLabel(session.role)}</div>
        <button
          type="button"
          onClick={signOut}
          className="mt-3 text-[11.5px] font-semibold text-gold hover:text-[#c99545]"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
