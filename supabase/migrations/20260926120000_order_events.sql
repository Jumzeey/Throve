-- Staff order events for admin inspector (notes / escalate). No order status mutations.

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null
    check (
      action in (
        'note',
        'escalated'
      )
    ),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_idx
  on public.order_events (order_id, created_at desc);

comment on table public.order_events is
  'Staff order history for admin inspector; also write admin_audit_log on mutations.';
