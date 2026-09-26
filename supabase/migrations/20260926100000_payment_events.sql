-- Admin payment events + list indexes for payment_intents.

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid not null references public.payment_intents (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null
    check (
      action in (
        'created',
        'note',
        'reconcile',
        'status_changed',
        'escalated'
      )
    ),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists payment_events_intent_idx
  on public.payment_events (payment_intent_id, created_at desc);

create index if not exists payment_intents_order_idx
  on public.payment_intents (order_id);

create index if not exists payment_intents_status_created_idx
  on public.payment_intents (status, created_at desc);

drop trigger if exists payment_intents_updated_at on public.payment_intents;
create trigger payment_intents_updated_at before update on public.payment_intents
  for each row execute function public.set_updated_at();

comment on table public.payment_events is
  'Payment intent history for admin inspector; also write admin_audit_log on staff mutations.';
