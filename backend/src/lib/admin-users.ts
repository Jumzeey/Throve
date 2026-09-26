import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from './supabase.js';

export type AccountStatus = 'active' | 'restricted' | 'suspended' | 'banned';

export type UserEventAction =
  | 'note'
  | 'escalated'
  | 'restricted'
  | 'unrestricted'
  | 'suspended'
  | 'unsuspended'
  | 'ban_recommended'
  | 'banned'
  | 'unbanned'
  | 'approve_host'
  | 'revoke_host';

export type UserUiStatus = 'Active' | 'Restricted' | 'Suspended' | 'Deactivated' | 'Banned';

export function uiStatusFromProfile(row: {
  account_status?: string | null;
  deactivated?: boolean | null;
}): UserUiStatus {
  const status = String(row.account_status ?? 'active');
  if (status === 'banned') return 'Banned';
  if (status === 'suspended') return 'Suspended';
  if (status === 'restricted') return 'Restricted';
  if (row.deactivated) return 'Deactivated';
  return 'Active';
}

export function deriveKycStatus(seller: boolean, payoutVerified: boolean): MockKyc {
  if (!seller) return 'None';
  if (payoutVerified) return 'Verified';
  return 'Pending';
}

type MockKyc = 'None' | 'Pending' | 'Verified' | 'Failed' | 'Rejected';

export function deriveLiveHost(canHostLive: boolean): 'None' | 'Pending' | 'Approved' | 'Revoked' {
  return canHostLive ? 'Approved' : 'None';
}

export function formatAt(iso: string) {
  return iso.slice(0, 16).replace('T', ' ');
}

export function openJoined(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function recordUserEvent(
  userId: string,
  actorId: string | null,
  action: UserEventAction,
  reason?: string | null,
  meta?: Record<string, unknown>,
) {
  const service = createServiceClient();
  const { error } = await service.from('user_events').insert({
    user_id: userId,
    actor_id: actorId,
    action,
    reason: reason ?? null,
    meta: meta ?? {},
  });
  if (error) console.warn('[admin/users] event write failed', error.message);
}

/** Hide seller listings (same pattern as self-deactivate). */
export async function hideSellerListings(service: SupabaseClient, sellerId: string) {
  const { error } = await service
    .from('listings')
    .update({ status: 'hidden' })
    .eq('seller_id', sellerId)
    .in('status', ['available', 'draft', 'pending_review', 'reserved']);
  if (error) console.warn('[admin/users] hide listings failed', error.message);
}

/**
 * If suspension expired, clear back to active.
 * Returns the effective account_status after possible auto-clear.
 */
export async function refreshExpiredSuspension(
  service: SupabaseClient,
  profile: {
    id: string;
    account_status?: string | null;
    suspended_until?: string | null;
  },
): Promise<AccountStatus> {
  const status = String(profile.account_status ?? 'active') as AccountStatus;
  if (status !== 'suspended' || !profile.suspended_until) return status;
  const until = new Date(profile.suspended_until).getTime();
  if (Number.isNaN(until) || until > Date.now()) return status;

  await service
    .from('profiles')
    .update({
      account_status: 'active',
      suspended_until: null,
      account_status_reason: 'Suspension expired',
      account_status_changed_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
    .eq('account_status', 'suspended');

  return 'active';
}

export async function assertNotStaffTarget(profile: {
  admin_role?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (profile.admin_role) {
    return { ok: false, message: 'Cannot enforce against staff accounts' };
  }
  return { ok: true };
}
