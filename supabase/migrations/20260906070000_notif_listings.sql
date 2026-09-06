-- Email/alert preference for new listings from sellers you follow.
alter table public.profiles
  add column if not exists notif_listings boolean not null default true;

comment on column public.profiles.notif_listings is
  'When true, send in-app, push, and email when a followed seller publishes a listing.';
