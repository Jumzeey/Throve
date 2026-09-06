-- Ensure notification preference columns used by Settings / notifyUser.
alter table public.profiles add column if not exists notif_orders boolean not null default true;
alter table public.profiles add column if not exists notif_live boolean not null default true;
alter table public.profiles add column if not exists notif_push_enabled boolean not null default true;
