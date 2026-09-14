-- Allow host/moderators to pin one comment per live session (Instagram-style).
alter table public.live_comments
  add column if not exists is_pinned boolean not null default false;

create unique index if not exists live_comments_one_pinned_per_session_idx
  on public.live_comments (session_id)
  where is_pinned;
