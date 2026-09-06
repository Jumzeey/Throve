-- Host broadcast metrics for session summary.
alter table public.live_sessions
  add column if not exists peak_viewers integer not null default 0,
  add column if not exists products_shown integer not null default 0;

comment on column public.live_sessions.peak_viewers is 'Highest concurrent viewer count observed during the live';
comment on column public.live_sessions.products_shown is 'Distinct products pinned/shown during the live';
