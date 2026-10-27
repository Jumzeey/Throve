-- Admin-proposed listing edits.
--
-- A super admin reviewing a listing can propose changed details (e.g. title "African attire"
-- -> "African attire (male)"). The listing moves to `changes_proposed` and the seller is
-- notified. The seller can:
--   * accept   -> the changes are applied and the listing goes back to pending_review,
--   * decline  -> with a note; the listing goes back to pending_review unchanged,
--   * edit it themselves and resubmit -> the proposal is superseded.
-- Either way a super admin still gives final approval through the normal review queue.

alter type public.listing_status add value if not exists 'changes_proposed';

create table if not exists public.listing_edit_proposals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  proposed_by uuid references public.profiles (id) on delete set null,
  -- Only the fields being changed: { "title": "...", "category": "..." }.
  changes jsonb not null check (jsonb_typeof(changes) = 'object' and changes <> '{}'::jsonb),
  -- The listing's values for those same fields when the proposal was made.
  previous jsonb not null default '{}'::jsonb,
  note text,
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'rejected', 'superseded', 'withdrawn')),
  seller_note text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_edit_proposals_listing_idx
  on public.listing_edit_proposals (listing_id, created_at desc);

-- At most one open proposal per listing.
create unique index if not exists listing_edit_proposals_open_uidx
  on public.listing_edit_proposals (listing_id)
  where status = 'proposed';

drop trigger if exists listing_edit_proposals_updated_at on public.listing_edit_proposals;
create trigger listing_edit_proposals_updated_at before update on public.listing_edit_proposals
  for each row execute function public.set_updated_at();

-- Backend only.
alter table public.listing_edit_proposals enable row level security;

-- Review history gains the proposal events.
alter table public.listing_review_events
  drop constraint if exists listing_review_events_action_check;
alter table public.listing_review_events
  add constraint listing_review_events_action_check
  check (
    action in (
      'submitted',
      'resubmitted',
      'approved',
      'rejected',
      'hidden',
      'restored',
      'note',
      'escalated',
      'edit_proposed',
      'edit_withdrawn',
      'edit_accepted',
      'edit_declined',
      'edit_superseded'
    )
  );
