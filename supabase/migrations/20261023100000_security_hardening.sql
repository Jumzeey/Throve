-- Security hardening: close direct Data API writes that bypass the backend's checks.
--
-- Before this migration, any signed-in user holding the public anon key could call
-- PostgREST directly and:
--   * set their own profiles.admin_role / can_host_live / payout_verified / account_status,
--   * read every user's email, phone and date of birth,
--   * rewrite their orders (status, totals, payout_status), offers, reviews and disputes,
--   * move a listing from pending_review / hidden straight to available.
--
-- The backend now performs these writes with the service role after its own ownership
-- checks, so the client-facing policies below are removed or narrowed.

-- ---------------------------------------------------------------------------
-- Profiles: no direct client writes; only public columns are readable.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can update own profile" on public.profiles;

revoke insert, update, delete on public.profiles from anon, authenticated;

revoke select on public.profiles from anon, authenticated;
grant select (
  id,
  name,
  username,
  bio,
  location,
  photo_url,
  can_host_live,
  setup_complete,
  deactivated,
  last_seen_at,
  created_at,
  updated_at
) on public.profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Orders, disputes, reviews, offers, live claims: backend (service role) only.
-- Participants keep read access.
-- ---------------------------------------------------------------------------

drop policy if exists "Buyers can create orders" on public.orders;
drop policy if exists "Participants can update orders" on public.orders;

drop policy if exists "Buyers can open disputes on own orders" on public.order_disputes;
drop policy if exists "Order participants can update disputes" on public.order_disputes;

drop policy if exists "Buyers can create reviews" on public.reviews;

drop policy if exists "Participants can create offers" on public.offers;
drop policy if exists "Participants can update offers" on public.offers;

drop policy if exists "Users can create claims" on public.live_claims;

-- ---------------------------------------------------------------------------
-- Listings: sellers still write their own rows, but only through allowed status
-- changes. Approval (pending_review -> available) and un-hiding stay with staff.
-- ---------------------------------------------------------------------------

create or replace function public.guard_listing_client_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Service role, postgres and other trusted roles are not restricted.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'New listings must start as draft' using errcode = '42501';
    end if;
    if new.reviewed_at is not null or new.reviewed_by is not null or new.review_reason is not null
       or new.review_submitted_at is not null then
      raise exception 'Review fields are managed by Throve' using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status in ('pending_review', 'removed', 'hidden'))
      or (old.status = 'rejected' and new.status in ('pending_review', 'removed'))
      or (old.status = 'pending_review' and new.status = 'removed')
      or (old.status = 'available' and new.status in ('reserved', 'sold', 'removed', 'hidden'))
      or (old.status = 'reserved' and new.status in ('available', 'sold'))
      or (old.status = 'hidden' and new.status = 'removed')
    ) then
      raise exception 'Listing status change % -> % is not allowed', old.status, new.status
        using errcode = '42501';
    end if;
  end if;

  if new.status = 'pending_review' and old.status is distinct from 'pending_review' then
    -- Submitting for review may clear the previous decision.
    if new.reviewed_at is not null or new.reviewed_by is not null or new.review_reason is not null then
      raise exception 'Review fields are managed by Throve' using errcode = '42501';
    end if;
  elsif new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by
     or new.review_reason is distinct from old.review_reason
     or new.review_submitted_at is distinct from old.review_submitted_at then
    raise exception 'Review fields are managed by Throve' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists listings_guard_client_write on public.listings;
create trigger listings_guard_client_write
  before insert or update on public.listings
  for each row execute function public.guard_listing_client_write();
