import { BrandMark } from '@/components/brand-mark';
import { NavLink } from 'react-router-dom';
import {
  ClipboardList,
  CreditCard,
  Disc3,
  FileWarning,
  History,
  LayoutDashboard,
  Package,
  CircleDollarSign,
  RefreshCcw,
  ScrollText,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth, roleLabel } from '../../auth/AuthContext';
import { mockBadgeCounts } from '../../data/mock';
import {
  canAccess,
  navSectionsFor,
  ROUTE_PATHS,
  type AdminRole,
  type AdminRoute,
} from '../../lib/roles';
import { cn } from '@/lib/utils';

function routeLabel(route: AdminRoute, role: AdminRole) {
  if (route === 'disputes') {
    if (role === 'finance') return 'Disputes · outcomes';
    if (role === 'support') return 'Disputes · status';
    return 'Disputes';
  }
  const labels: Record<AdminRoute, string> = {
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
  return labels[route];
}

function routeIcon(route: AdminRoute, role: AdminRole) {
  if (route === 'disputes' && role === 'finance') return History;
  if (route === 'orders' && (role === 'finance' || role === 'super_admin')) return CreditCard;
  const icons: Record<AdminRoute, typeof LayoutDashboard> = {
    operations: LayoutDashboard,
    users: Users,
    listings: Package,
    reports: FileWarning,
    live: Disc3,
    orders: ClipboardList,
    disputes: History,
    payments: Wallet,
    refunds: RefreshCcw,
    payouts: CircleDollarSign,
    reviews: Star,
    audit: ScrollText,
  };
  return icons[route];
}

const BADGES: Partial<Record<AdminRoute, number>> = {
  listings: mockBadgeCounts.listings,
  reports: mockBadgeCounts.reports,
  live: mockBadgeCounts.live,
  disputes: mockBadgeCounts.disputes,
  orders: mockBadgeCounts.orders,
  payments: mockBadgeCounts.payments,
  refunds: mockBadgeCounts.refunds,
  payouts: mockBadgeCounts.payouts,
};

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { session, signOut } = useAuth();
  if (!session) return null;

  const sections = navSectionsFor(session.role)
    .map((section) => ({
      ...section,
      routes: section.routes.filter((route) => canAccess(session.role, route)),
    }))
    .filter((section) => section.routes.length > 0);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-sidebar text-panel">
      <div className="border-b border-white/10 px-[22px] pb-[22px] pt-5">
        <BrandMark variant="onDark" size="md" showWordmark />
        <div className="mt-2 text-[9.5px] font-semibold tracking-[0.2em] text-gold uppercase">
          Admin console
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto py-3">
        {sections.map((section, sectionIndex) => (
          <div key={section.label}>
            {sectionIndex > 0 ? <div className="mx-[22px] my-3 border-t border-white/10" /> : null}
            <div className="px-[22px] pt-2 pb-2 text-[9.5px] font-semibold tracking-[0.16em] text-[rgba(255,247,240,0.38)] uppercase">
              {section.label}
            </div>
            <div className="flex flex-col gap-0.5 px-2">
              {section.routes.map((route) => {
                const Icon = routeIcon(route, session.role);
                return (
                  <NavLink
                    key={route}
                    to={ROUTE_PATHS[route]}
                    end={route === 'operations'}
                    onClick={() => onNavigate?.()}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between gap-2 border-l-2 py-2.5 pr-2.5 pl-[18px] text-[12.5px] transition',
                        isActive
                          ? 'rounded-[4px] border-gold bg-[rgba(255,247,240,0.09)] font-semibold text-panel'
                          : 'rounded-[4px] border-transparent text-[rgba(255,247,240,0.72)] hover:bg-[rgba(255,247,240,0.05)] hover:text-panel',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Icon
                            className={cn(
                              'size-[15px] shrink-0',
                              isActive ? 'text-panel' : 'text-[rgba(255,247,240,0.55)]',
                            )}
                            strokeWidth={1.7}
                          />
                          <span className="truncate">{routeLabel(route, session.role)}</span>
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
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-[22px] py-4">
        <div className="text-[10.5px] leading-relaxed text-[rgba(255,247,240,0.42)]">Signed in as</div>
        <div className="mt-0.5 text-[12.5px] font-semibold text-panel">{session.name}</div>
        <div className="mt-0.5 text-[10.5px] text-gold">{roleLabel(session.role)}</div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-3 text-[11.5px] font-semibold text-gold hover:text-[#c99545]"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden h-full w-[236px] shrink-0 lg:flex">
      <SidebarNav />
    </aside>
  );
}
