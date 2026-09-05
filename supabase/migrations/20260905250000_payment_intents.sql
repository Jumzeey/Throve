-- Tracks Flutterwave (or simulated) checkout payments before order creation.
create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  tx_ref text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete restrict,
  amount integer not null,
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending', 'successful', 'failed', 'cancelled')),
  provider text not null default 'flutterwave',
  provider_ref text,
  order_id text references public.orders(id) on delete set null,
  checkout_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_intents_user_idx on public.payment_intents (user_id);
create index if not exists payment_intents_status_idx on public.payment_intents (status);

alter table public.payment_intents enable row level security;

-- Policies (apply via migration / dashboard). Backend uses service role for writes.
-- create policy "Users can view own payment intents" on public.payment_intents
--   for select using (auth.uid() = user_id);
-- create policy "Users can create own payment intents" on public.payment_intents
--   for insert with check (auth.uid() = user_id);
-- create policy "Users can update own payment intents" on public.payment_intents
--   for update using (auth.uid() = user_id);
