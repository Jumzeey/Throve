-- Order fulfillment: tracking, timestamps, disputes, payout fields
-- Requires order_status.delivered already committed

create type public.payout_status as enum (
  'not_yet_eligible',
  'eligible',
  'processing',
  'paid_out',
  'on_hold',
  'failed'
);

create type public.dispute_status as enum (
  'open',
  'under_review',
  'resolved_buyer',
  'resolved_seller',
  'closed'
);

alter table public.orders
  add column if not exists tracking_number text,
  add column if not exists tracking_carrier text,
  add column if not exists paid_at timestamptz,
  add column if not exists dispatched_at timestamptz,
  add column if not exists in_transit_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists auto_complete_at timestamptz,
  add column if not exists payout_status public.payout_status not null default 'not_yet_eligible';

update public.orders
set paid_at = coalesce(paid_at, created_at)
where paid_at is null;

alter table public.profiles
  add column if not exists payout_verified boolean not null default false;

create table if not exists public.order_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  opened_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  status public.dispute_status not null default 'under_review',
  buyer_note text not null default '',
  seller_response text not null default '',
  evidence_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (order_id)
);

create index if not exists order_disputes_order_idx on public.order_disputes (order_id);
create index if not exists order_disputes_status_idx on public.order_disputes (status);
create index if not exists orders_auto_complete_idx
  on public.orders (auto_complete_at)
  where status = 'delivered' and auto_complete_at is not null;

create trigger order_disputes_updated_at before update on public.order_disputes
  for each row execute function public.set_updated_at();

alter table public.order_disputes enable row level security;

create policy "Order participants can view disputes" on public.order_disputes
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

create policy "Buyers can open disputes on own orders" on public.order_disputes
  for insert with check (
    opened_by = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.buyer_id = auth.uid()
    )
  );

create policy "Order participants can update disputes" on public.order_disputes
  for update using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );
