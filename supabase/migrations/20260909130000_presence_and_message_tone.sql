-- Chat presence (last seen) and configurable message notification tone.

alter table public.profiles
  add column if not exists last_seen_at timestamptz,
  add column if not exists notif_message_tone text not null default 'default';

alter table public.profiles drop constraint if exists profiles_notif_message_tone_check;
alter table public.profiles
  add constraint profiles_notif_message_tone_check
  check (notif_message_tone in ('default', 'note', 'chime', 'soft', 'none'));

create index if not exists profiles_last_seen_at_idx on public.profiles (last_seen_at desc);

comment on column public.profiles.last_seen_at is 'Updated by the app while open; used for chat online / last seen.';
comment on column public.profiles.notif_message_tone is 'Chat notification sound: default | note | chime | soft | none';

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end $$;
