-- Platform-wide staff action audit for the admin console.
-- listing_review_events remains for listing-specific review history;
-- every sensitive admin mutation should also write here via writeAdminAudit.

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid not null references public.profiles (id),
  actor_role public.admin_role not null,
  action text not null,
  resource_type text not null,
  resource_id text not null,
  reason text,
  meta jsonb not null default '{}'::jsonb,
  sensitivity text not null default 'Standard'
    check (sensitivity in ('Access', 'Standard', 'High'))
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);

create index if not exists admin_audit_log_resource_idx
  on public.admin_audit_log (resource_type, resource_id);

create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (actor_id);

comment on table public.admin_audit_log is
  'Staff console audit trail. Written by backend writeAdminAudit; read via GET /admin/audit (later).';
