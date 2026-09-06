-- Reports from live viewer (··· menu): session, host user, or pinned listing.
create table if not exists public.live_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  kind text not null check (kind in ('session', 'user', 'listing')),
  target_username text,
  listing_id uuid references public.listings(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists live_reports_session_idx on public.live_reports (live_session_id);
create index if not exists live_reports_reporter_idx on public.live_reports (reporter_id);

alter table public.live_reports enable row level security;

create policy "Users can create live reports"
  on public.live_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "Users can view own live reports"
  on public.live_reports for select
  to authenticated
  using (reporter_id = auth.uid());
