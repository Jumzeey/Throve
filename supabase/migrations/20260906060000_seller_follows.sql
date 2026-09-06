-- Seller follows: buyers follow sellers to see new stock on Home and get listing alerts.
create table if not exists public.seller_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, seller_id),
  check (follower_id <> seller_id)
);

create index if not exists seller_follows_seller_idx on public.seller_follows (seller_id);
create index if not exists seller_follows_follower_idx on public.seller_follows (follower_id);
create index if not exists seller_follows_created_idx on public.seller_follows (created_at desc);

alter table public.seller_follows enable row level security;

create policy "Users can view follows they are in"
  on public.seller_follows for select
  to authenticated
  using (follower_id = auth.uid() or seller_id = auth.uid());

create policy "Users can follow sellers"
  on public.seller_follows for insert
  to authenticated
  with check (follower_id = auth.uid());

create policy "Users can unfollow sellers"
  on public.seller_follows for delete
  to authenticated
  using (follower_id = auth.uid());

-- Public follower counts for seller cards (security_invoker so RLS still applies for private reads;
-- counts for display use service role / backend queries).
