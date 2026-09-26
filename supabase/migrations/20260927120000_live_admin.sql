-- Admin Live session monitoring: staff escalate/end + event history.

alter table public.live_sessions
  add column if not exists escalated_at timestamptz,
  add column if not exists ended_reason text
    check (ended_reason is null or ended_reason in ('host', 'staff', 'connection'));

create index if not exists live_sessions_status_started_idx
  on public.live_sessions (status, started_at desc nulls last);

create index if not exists live_sessions_escalated_idx
  on public.live_sessions (escalated_at)
  where escalated_at is not null;

create table if not exists public.live_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null
    check (action in ('note', 'escalated', 'ended_by_staff', 'received')),
  reason text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists live_events_session_idx
  on public.live_events (session_id, created_at desc);

comment on table public.live_events is
  'Staff live-session history for admin inspector; also write admin_audit_log on mutations.';

comment on column public.live_sessions.escalated_at is
  'Set when Trust & Safety escalates session risk; drives Incident UI badge.';

comment on column public.live_sessions.ended_reason is
  'Who/why the session ended: host | staff | connection.';
