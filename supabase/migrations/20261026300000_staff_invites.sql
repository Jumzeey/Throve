-- Staff invites: super admins invite @throve.store addresses by email. The invitee proves
-- they own the address by opening the emailed link and setting a password; only then is
-- the admin role applied, so an unaccepted invite cannot sign in to the admin console.

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and email like '%@throve.store'),
  name text not null default '',
  role public.admin_role not null,
  -- sha256 of the emailed token; the token itself is never stored.
  token_hash text not null unique,
  invited_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one open invite per address.
create unique index if not exists staff_invites_open_email_uidx
  on public.staff_invites (email)
  where accepted_at is null and revoked_at is null;

drop trigger if exists staff_invites_updated_at on public.staff_invites;
create trigger staff_invites_updated_at before update on public.staff_invites
  for each row execute function public.set_updated_at();

-- Backend only.
alter table public.staff_invites enable row level security;
