-- Finance payouts ledger for admin console.

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique references public.orders (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  dispute_id uuid references public.order_disputes (id) on delete set null,
  status text not null
    check (
      status in (
        'not_yet_eligible',
        'eligible',
        'verification_required',
        'on_hold',
        'processing',
        'failed',
        'paid_out',
        'cancelled'
      )
    ),
  sale_total integer not null default 0,
  commission integer not null default 0,
  fees integer not null default 0,
  net integer not null default 0,
  commission_rate numeric not null default 0.075,
  fee_note text,
  hold_reason text,
  hold_seller_facing text,
  processing_at timestamptz,
  processing_by uuid references public.profiles (id),
  paid_at timestamptz,
  paid_by uuid references public.profiles (id),
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payouts_status_idx on public.payouts (status);
create index if not exists payouts_seller_idx on public.payouts (seller_id);
create index if not exists payouts_created_at_idx on public.payouts (created_at desc);

create trigger payouts_updated_at before update on public.payouts
  for each row execute function public.set_updated_at();

create table if not exists public.payout_events (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references public.payouts (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null
    check (
      action in (
        'created',
        'note',
        'hold',
        'release',
        'execute',
        'retry',
        'paid_out',
        'failed',
        'cancelled'
      )
    ),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists payout_events_payout_idx
  on public.payout_events (payout_id, created_at desc);

comment on table public.payouts is
  'Staff Finance payout ledger. Synced from orders.payout_status; execute is status-only until PSP transfer lands.';

comment on table public.payout_events is
  'Payout history for admin inspector; also write admin_audit_log on mutations.';
