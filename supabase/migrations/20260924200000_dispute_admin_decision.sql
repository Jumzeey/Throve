-- Staff dispute decisions + event history for admin console.

alter table public.order_disputes
  add column if not exists decision text
    check (decision is null or decision in ('refund_buyer', 'release_seller', 'close')),
  add column if not exists decision_reason text,
  add column if not exists resolved_by uuid references public.profiles (id);

create table if not exists public.dispute_events (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.order_disputes (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null
    check (
      action in (
        'opened',
        'seller_responded',
        'evidence_added',
        'note',
        'escalated',
        'decided'
      )
    ),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists dispute_events_dispute_idx
  on public.dispute_events (dispute_id, created_at desc);

comment on table public.dispute_events is
  'Staff and system dispute history for admin inspector; audit also writes admin_audit_log.';
