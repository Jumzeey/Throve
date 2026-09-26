-- Staff account enforcement on profiles + user_events history.

alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'restricted', 'suspended', 'banned')),
  add column if not exists account_status_reason text,
  add column if not exists account_status_changed_at timestamptz,
  add column if not exists account_status_changed_by uuid references public.profiles (id),
  add column if not exists suspended_until timestamptz,
  add column if not exists ban_recommended_at timestamptz,
  add column if not exists ban_recommended_by uuid references public.profiles (id),
  add column if not exists ban_recommendation_reason text;

create index if not exists profiles_account_status_idx
  on public.profiles (account_status);

create index if not exists profiles_account_status_created_idx
  on public.profiles (account_status, created_at desc);

create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null
    check (
      action in (
        'note',
        'escalated',
        'restricted',
        'unrestricted',
        'suspended',
        'unsuspended',
        'ban_recommended',
        'banned',
        'unbanned',
        'approve_host',
        'revoke_host'
      )
    ),
  reason text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_events_user_idx
  on public.user_events (user_id, created_at desc);

comment on table public.user_events is
  'Staff user history for admin inspector; also write admin_audit_log on mutations.';

comment on column public.profiles.account_status is
  'Staff enforcement status. Self-service deactivation remains profiles.deactivated.';
