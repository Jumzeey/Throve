-- Seller payout bank accounts, provider refs for payouts/refunds, and job leases.

create table if not exists public.seller_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null unique references public.profiles (id) on delete cascade,
  bank_code text not null,
  bank_name text not null,
  account_number text not null check (account_number ~ '^[0-9]{10}$'),
  account_number_last4 text not null,
  account_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'failed')),
  provider text not null default 'simulate'
    check (provider in ('simulate', 'flutterwave')),
  provider_recipient_id text,
  failure_reason text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seller_payout_accounts_status_idx
  on public.seller_payout_accounts (status);

create trigger seller_payout_accounts_updated_at before update on public.seller_payout_accounts
  for each row execute function public.set_updated_at();

-- Full account numbers never leave the backend: no client policies, service role only.
alter table public.seller_payout_accounts enable row level security;

comment on table public.seller_payout_accounts is
  'Seller bank account for payouts. Service-role only; API returns masked numbers.';

alter table public.payouts add column if not exists provider text;
alter table public.payouts add column if not exists provider_ref text;
alter table public.refunds add column if not exists provider_ref text;

alter table public.payout_events drop constraint if exists payout_events_action_check;
alter table public.payout_events add constraint payout_events_action_check
  check (
    action in (
      'created',
      'note',
      'hold',
      'release',
      'execute',
      'retry',
      'paid_out',
      'failed',
      'cancelled',
      'verify'
    )
  );

create table if not exists public.job_leases (
  name text primary key,
  owner text not null,
  expires_at timestamptz not null
);

alter table public.job_leases enable row level security;

-- Returns true when the caller holds the lease (new, expired, or already theirs).
create or replace function public.claim_job_lease(p_name text, p_owner text, p_ttl_seconds integer)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  claimed text;
begin
  insert into public.job_leases (name, owner, expires_at)
  values (p_name, p_owner, now() + make_interval(secs => p_ttl_seconds))
  on conflict (name) do update
    set owner = excluded.owner,
        expires_at = excluded.expires_at
    where public.job_leases.expires_at < now()
       or public.job_leases.owner = excluded.owner
  returning owner into claimed;
  return coalesce(claimed = p_owner, false);
end;
$$;

revoke all on function public.claim_job_lease(text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_job_lease(text, text, integer) to service_role;
