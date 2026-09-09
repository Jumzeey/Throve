-- Bookmark upcoming lives. Reminders fire at 8:00 Africa/Lagos on the day and 10 minutes before start.

create table if not exists public.saved_lives (
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  reminded_day_of_at timestamptz,
  reminded_ten_min_at timestamptz,
  primary key (user_id, session_id)
);

create index if not exists saved_lives_session_idx on public.saved_lives (session_id);
create index if not exists saved_lives_user_created_idx on public.saved_lives (user_id, created_at desc);

alter table public.saved_lives enable row level security;

create policy "Users can view own saved lives"
  on public.saved_lives for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can save lives"
  on public.saved_lives for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can unsave lives"
  on public.saved_lives for delete
  to authenticated
  using (user_id = auth.uid());

create policy "Users can update own saved-live reminder flags"
  on public.saved_lives for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
