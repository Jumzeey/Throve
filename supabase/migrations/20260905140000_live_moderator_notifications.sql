-- Live moderator appointments (notifications + device_push_tokens already exist).

create table if not exists public.live_moderators (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  moderator_id uuid not null references public.profiles(id) on delete cascade,
  live_session_id uuid references public.live_sessions(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists live_moderators_session_mod_uidx
  on public.live_moderators (live_session_id, moderator_id)
  where live_session_id is not null;

create unique index if not exists live_moderators_host_pending_uidx
  on public.live_moderators (host_id, moderator_id)
  where live_session_id is null;

alter table public.live_moderators enable row level security;

drop policy if exists "Hosts and mods read live moderator rows" on public.live_moderators;
create policy "Hosts and mods read live moderator rows" on public.live_moderators
  for select using (auth.uid() = host_id or auth.uid() = moderator_id);
