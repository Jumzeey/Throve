/**
 * Staff RBAC for the admin console API.
 * Keep in sync with admin/src/lib/roles.ts when changing route/action matrices.
 */

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

export type StaffAction =
  | 'suspend_user'
  | 'restrict_user'
  | 'ban_user'
  | 'recommend_ban'
  | 'approve_live_host'
  | 'hide_listing'
  | 'restore_listing'
  | 'approve_listing'
  | 'reject_listing'
  | 'end_live'
  | 'decide_dispute'
  | 'execute_refund'
  | 'execute_payout'
  | 'hold_payout'
  | 'reconcile_payment'
  | 'hide_review'
  | 'view_sensitive_finance'
  | 'view_kyc_payout'
  | 'dismiss_report'
  | 'close_report'
  | 'mark_report_action_taken';

const ALL: AdminRole[] = ['super_admin', 'trust_safety', 'support', 'finance'];

/** Least-privilege map — mirror of admin SPA ROUTE_ROLES. */
export const ROUTE_ROLES: Record<AdminRoute, AdminRole[]> = {
  operations: ALL,
  users: ['super_admin', 'trust_safety', 'support', 'finance'],
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

/** Least-privilege map — mirror of admin SPA ACTION_ROLES. */
export const ACTION_ROLES: Record<StaffAction, AdminRole[]> = {
  suspend_user: ['super_admin', 'trust_safety'],
  restrict_user: ['super_admin', 'trust_safety'],
  ban_user: ['super_admin'],
  recommend_ban: ['super_admin', 'trust_safety'],
  approve_live_host: ['super_admin', 'trust_safety'],
  hide_listing: ['super_admin', 'trust_safety'],
  restore_listing: ['super_admin', 'trust_safety'],
  approve_listing: ['super_admin', 'trust_safety'],
  reject_listing: ['super_admin', 'trust_safety'],
  end_live: ['super_admin', 'trust_safety'],
  decide_dispute: ['super_admin', 'trust_safety'],
  execute_refund: ['super_admin', 'finance'],
  execute_payout: ['super_admin', 'finance'],
  hold_payout: ['super_admin', 'finance'],
  reconcile_payment: ['super_admin', 'finance'],
  hide_review: ['super_admin', 'trust_safety'],
  view_sensitive_finance: ['super_admin', 'finance', 'trust_safety'],
  view_kyc_payout: ['super_admin', 'trust_safety', 'finance'],
  dismiss_report: ['super_admin', 'trust_safety'],
  close_report: ['super_admin', 'trust_safety'],
  mark_report_action_taken: ['super_admin', 'trust_safety'],
};

export function canAccessRoute(role: AdminRole, route: AdminRoute): boolean {
  return ROUTE_ROLES[route].includes(role);
}

export function canStaffAct(role: AdminRole, action: StaffAction): boolean {
  return ACTION_ROLES[action].includes(role);
}

/** @deprecated Prefer canStaffAct(role, 'approve_listing' | 'reject_listing' | …) */
export function staffCanModerateListings(role: AdminRole): boolean {
  return canStaffAct(role, 'approve_listing');
}
