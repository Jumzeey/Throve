-- Finance refunds ledger for admin console (dispute buyer_buyer queue).

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders (id) on delete restrict,
  dispute_id uuid references public.order_disputes (id) on delete set null,
  payment_intent_id uuid references public.payment_intents (id) on delete set null,
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  status text not null
    check (
      status in (
        'awaiting_finance',
        'ready',
        'processing',
        'completed',
        'uncertain',
        'failed'
      )
    ),
  origin text not null default 'eligible_dispute',
  origin_detail text not null default '',
  item_amount integer not null default 0,
  buyer_protection_amount integer not null default 0,
  delivery_amount integer not null default 0,
  buyer_protection_included boolean not null default true,
  include_delivery boolean,
  needs_delivery_determination boolean not null default false,
  total_amount integer,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  processing_at timestamptz,
  processing_by uuid references public.profiles (id),
  completed_at timestamptz,
  completed_by uuid references public.profiles (id),
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dispute_id)
);

create index if not exists refunds_status_idx on public.refunds (status);
create index if not exists refunds_order_idx on public.refunds (order_id);
create index if not exists refunds_created_at_idx on public.refunds (created_at desc);

create trigger refunds_updated_at before update on public.refunds
  for each row execute function public.set_updated_at();

create table if not exists public.refund_events (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null references public.refunds (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null
    check (
      action in (
        'created',
        'note',
        'execute',
        'retry',
        'completed',
        'failed',
        'verify'
      )
    ),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists refund_events_refund_idx
  on public.refund_events (refund_id, created_at desc);

comment on table public.refunds is
  'Staff Finance refund ledger. Created on dispute refund_buyer; execute is status-only until PSP refund lands.';

comment on table public.refund_events is
  'Refund history for admin inspector; also write admin_audit_log on mutations.';
