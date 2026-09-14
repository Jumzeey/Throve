-- Step 2: review columns, staff role, audit events (after enum values are committed).

alter table public.listings
  add column if not exists review_submitted_at timestamptz,
  add column if not exists review_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

alter table public.profiles
  add column if not exists admin_role public.admin_role;

create index if not exists listings_pending_review_idx
  on public.listings (status, review_submitted_at desc)
  where status = 'pending_review';

create table if not exists public.listing_review_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('submitted', 'resubmitted', 'approved', 'rejected')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists listing_review_events_listing_idx
  on public.listing_review_events (listing_id, created_at desc);

alter table public.listing_review_events enable row level security;
