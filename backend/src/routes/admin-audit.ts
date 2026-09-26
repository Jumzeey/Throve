import { Router } from 'express';
import {
  buildAuditDto,
  dateCutoff,
  humanizeAction,
  visibilityDepthFor,
  type AdminAuditDto,
  type AuditLogRow,
} from '../lib/admin-audit-read.js';
import { handleSupabaseError, sendError } from '../lib/errors.js';
import { ROUTE_ROLES } from '../lib/staff-rbac.js';
import { createServiceClient } from '../lib/supabase.js';
import {
  requireStaffAuth,
  requireStaffRole,
  type StaffRequest,
} from '../middleware/staff.js';

const router = Router();
const routeRoles = ROUTE_ROLES.audit;
const FETCH_WINDOW = 500;

async function fetchActorNames(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const service = createServiceClient();
  const { data, error } = await service
    .from('profiles')
    .select('id, username')
    .in('id', unique);
  if (error) throw error;
  for (const row of data ?? []) {
    map.set(String(row.id), row.username ? String(row.username) : 'staff');
  }
  return map;
}

async function relatedFor(
  resourceType: string,
  resourceId: string,
  excludeId: string,
): Promise<{ id: string; label: string; openLabel: string }[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from('admin_audit_log')
    .select('id, action, created_at')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .neq('id', excludeId)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: String(r.id),
    label: humanizeAction(String(r.action)),
    openLabel: 'Open event',
  }));
}

function parseMeta(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function toRow(raw: Record<string, unknown>): AuditLogRow {
  return {
    id: String(raw.id),
    created_at: String(raw.created_at),
    actor_id: String(raw.actor_id),
    actor_role: String(raw.actor_role),
    action: String(raw.action),
    resource_type: String(raw.resource_type),
    resource_id: String(raw.resource_id),
    reason: raw.reason != null ? String(raw.reason) : null,
    meta: parseMeta(raw.meta),
    sensitivity: String(raw.sensitivity ?? 'Standard'),
  };
}

function matchesFilters(
  dto: AdminAuditDto,
  opts: {
    module: string;
    result: string;
    actorRole: string;
    q: string;
  },
) {
  if (opts.module !== 'all' && dto.module !== opts.module) return false;
  if (opts.result !== 'all' && dto.result !== opts.result) return false;
  if (opts.actorRole !== 'all' && dto.role !== opts.actorRole) return false;
  const q = opts.q.trim().toLowerCase();
  if (!q) return true;
  return (
    dto.id.toLowerCase().includes(q) ||
    dto.actor.toLowerCase().includes(q) ||
    dto.action.toLowerCase().includes(q) ||
    dto.recordId.toLowerCase().includes(q) ||
    dto.module.toLowerCase().includes(q) ||
    (dto.recordSub?.toLowerCase().includes(q) ?? false)
  );
}

router.get('/', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const staff = req as StaffRequest;
  const date = (String(req.query.date ?? '7d') as '7d' | '30d' | 'all') || '7d';
  const module = String(req.query.module ?? 'all');
  const result = String(req.query.result ?? 'all');
  const actorRole = String(req.query.actorRole ?? 'all');
  const q = String(req.query.q ?? '');
  const limitRaw = Number(req.query.limit ?? 100);
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 100));

  try {
    const service = createServiceClient();
    let query = service
      .from('admin_audit_log')
      .select(
        'id, created_at, actor_id, actor_role, action, resource_type, resource_id, reason, meta, sensitivity',
      )
      .order('created_at', { ascending: false })
      .limit(FETCH_WINDOW);

    const cutoff = dateCutoff(date === '7d' || date === '30d' || date === 'all' ? date : '7d');
    if (cutoff) query = query.gte('created_at', cutoff);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []).map((r) => toRow(r as Record<string, unknown>));
    const names = await fetchActorNames(rows.map((r) => r.actor_id));

    const visible: { row: AuditLogRow; depth: NonNullable<ReturnType<typeof visibilityDepthFor>> }[] =
      [];
    for (const row of rows) {
      const depth = visibilityDepthFor(staff.adminRole, staff.userId, row);
      if (!depth) continue;
      visible.push({ row, depth });
    }

    const eventsAll = visible.map(({ row, depth }) =>
      buildAuditDto(row, names.get(row.actor_id) ?? 'staff', staff.adminRole, depth),
    );

    const counts = {
      all: eventsAll.length,
      completed: eventsAll.filter((e) => e.result === 'Completed').length,
      denied: eventsAll.filter((e) => e.result === 'Denied').length,
    };

    const filtered = eventsAll
      .filter((e) => matchesFilters(e, { module, result, actorRole, q }))
      .slice(0, limit);

    return res.json({ events: filtered, counts });
  } catch (err) {
    return handleSupabaseError(res, err as { message: string });
  }
});

router.get('/:id', requireStaffAuth, requireStaffRole(...routeRoles), async (req, res) => {
  const staff = req as StaffRequest;
  const id = String(req.params.id);

  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from('admin_audit_log')
      .select(
        'id, created_at, actor_id, actor_role, action, resource_type, resource_id, reason, meta, sensitivity',
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return sendError(res, 404, 'Audit event not found');

    const row = toRow(data as Record<string, unknown>);
    const depth = visibilityDepthFor(staff.adminRole, staff.userId, row);
    if (!depth) return sendError(res, 404, 'Audit event not found');

    const names = await fetchActorNames([row.actor_id]);
    const related =
      depth === 'full' ? await relatedFor(row.resource_type, row.resource_id, row.id) : [];

    const event = buildAuditDto(
      row,
      names.get(row.actor_id) ?? 'staff',
      staff.adminRole,
      depth,
      related,
    );
    return res.json({ event });
  } catch (err) {
    return handleSupabaseError(res, err as { message: string });
  }
});

export default router;
