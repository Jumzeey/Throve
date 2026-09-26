import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminRole } from './staff-rbac.js';

export type AuditSensitivity = 'Access' | 'Standard' | 'High';

export type WriteAdminAuditInput = {
  actorId: string;
  actorRole: AdminRole;
  /** Stable key, e.g. listing.approve, dispute.decide */
  action: string;
  resourceType: string;
  resourceId: string;
  reason?: string | null;
  meta?: Record<string, unknown>;
  sensitivity?: AuditSensitivity;
};

/**
 * Persist a staff action to admin_audit_log.
 * Failures are logged but do not fail the caller — never block a completed mutation on audit write.
 */
export async function writeAdminAudit(
  service: SupabaseClient,
  input: WriteAdminAuditInput,
): Promise<void> {
  const { error } = await service.from('admin_audit_log').insert({
    actor_id: input.actorId,
    actor_role: input.actorRole,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    reason: input.reason ?? null,
    meta: input.meta ?? {},
    sensitivity: input.sensitivity ?? 'Standard',
  });
  if (error) {
    console.warn('[admin-audit] write failed', error.message, {
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    });
  }
}
