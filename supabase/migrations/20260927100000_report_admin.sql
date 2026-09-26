-- Admin triage workflow for chat_reports + live_reports.

alter table public.chat_reports
  add column if not exists status text not null default 'open'
    check (status in ('open', 'under_review', 'escalated', 'action_taken', 'dismissed', 'closed')),
  add column if not exists assignee_id uuid references public.profiles (id),
  add column if not exists details text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.live_reports
  add column if not exists status text not null default 'open'
    check (status in ('open', 'under_review', 'escalated', 'action_taken', 'dismissed', 'closed')),
  add column if not exists assignee_id uuid references public.profiles (id),
  add column if not exists details text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists chat_reports_status_created_idx
  on public.chat_reports (status, created_at desc);

create index if not exists chat_reports_target_username_idx
  on public.chat_reports (target_username);

create index if not exists live_reports_status_created_idx
  on public.live_reports (status, created_at desc);

create index if not exists live_reports_listing_idx
  on public.live_reports (listing_id)
  where listing_id is not null;

drop trigger if exists chat_reports_updated_at on public.chat_reports;
create trigger chat_reports_updated_at before update on public.chat_reports
  for each row execute function public.set_updated_at();

drop trigger if exists live_reports_updated_at on public.live_reports;
create trigger live_reports_updated_at before update on public.live_reports
  for each row execute function public.set_updated_at();

create table if not exists public.report_events (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('chat', 'live')),
  report_id uuid not null,
  actor_id uuid references public.profiles (id),
  action text not null
    check (
      action in (
        'received',
        'note',
        'escalated',
        'assigned',
        'under_review',
        'action_taken',
        'dismissed',
        'closed',
        'associated'
      )
    ),
  reason text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists report_events_report_idx
  on public.report_events (source, report_id, created_at desc);

comment on table public.report_events is
  'Staff report history for admin inspector; also write admin_audit_log on mutations.';
