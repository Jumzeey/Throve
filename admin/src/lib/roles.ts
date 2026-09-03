export type AdminRole = 'super_admin' | 'trust_safety' | 'support' | 'finance';

export type AdminRoute =
  | 'operations'
  | 'users'
  | 'listings'
  | 'reports'
  | 'live'
  | 'orders'
  | 'disputes'
  | 'payments'
  | 'refunds'
  | 'payouts'
  | 'reviews'
  | 'audit';

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  trust_safety: 'Trust & Safety',
  support: 'Customer Support',
  finance: 'Finance',
};

export const ROUTE_PATHS: Record<AdminRoute, string> = {
  operations: '/',
  users: '/users',
  listings: '/listings',
  reports: '/reports',
  live: '/live',
  orders: '/orders',
  disputes: '/disputes',
  payments: '/payments',
  refunds: '/refunds',
  payouts: '/payouts',
  reviews: '/reviews',
  audit: '/audit',
};

const ALL: AdminRole[] = ['super_admin', 'trust_safety', 'support', 'finance'];

/** Least-privilege map from Hi-Fi role notes. */
export const ROUTE_ROLES: Record<AdminRoute, AdminRole[]> = {
  operations: ALL,
  users: ['super_admin', 'trust_safety', 'support'],
  listings: ['super_admin', 'trust_safety', 'support'],
  reports: ['super_admin', 'trust_safety', 'support'],
  live: ['super_admin', 'trust_safety'],
  orders: ALL,
  disputes: ALL,
  payments: ['super_admin', 'finance'],
  refunds: ['super_admin', 'finance'],
  payouts: ['super_admin', 'finance'],
  reviews: ['super_admin', 'trust_safety'],
  audit: ['super_admin', 'trust_safety', 'support', 'finance'],
};

export function canAccess(role: AdminRole, route: AdminRoute) {
  return ROUTE_ROLES[route].includes(role);
}

export function navItemsFor(role: AdminRole): AdminRoute[] {
  return (Object.keys(ROUTE_ROLES) as AdminRoute[]).filter((route) => canAccess(role, route));
}

export type ActionKey =
  | 'suspend_user'
  | 'restrict_user'
  | 'ban_user'
  | 'approve_live_host'
  | 'hide_listing'
  | 'restore_listing'
  | 'end_live'
  | 'decide_dispute'
  | 'execute_refund'
  | 'execute_payout'
  | 'hold_payout'
  | 'hide_review'
  | 'view_sensitive_finance'
  | 'view_kyc_payout';

const ACTION_ROLES: Record<ActionKey, AdminRole[]> = {
  suspend_user: ['super_admin', 'trust_safety'],
  restrict_user: ['super_admin', 'trust_safety'],
  ban_user: ['super_admin', 'trust_safety'],
  approve_live_host: ['super_admin', 'trust_safety'],
  hide_listing: ['super_admin', 'trust_safety'],
  restore_listing: ['super_admin', 'trust_safety'],
  end_live: ['super_admin', 'trust_safety'],
  decide_dispute: ['super_admin', 'trust_safety'],
  execute_refund: ['super_admin', 'finance'],
  execute_payout: ['super_admin', 'finance'],
  hold_payout: ['super_admin', 'finance'],
  hide_review: ['super_admin', 'trust_safety'],
  view_sensitive_finance: ['super_admin', 'finance', 'trust_safety'],
  view_kyc_payout: ['super_admin', 'trust_safety', 'finance'],
};

/** Support sees masked KYC/payout; T&S/Finance/Super see values. */
export function canViewPayoutFields(role: AdminRole) {
  return canAct(role, 'view_kyc_payout');
}

export function canAct(role: AdminRole, action: ActionKey) {
  return ACTION_ROLES[action].includes(role);
}
