-- Listing quantities: a listing can sell more than once.
--
-- One stock pool per listing:
--   available = quantity - quantity_sold - quantity_held
-- Every sale path (product page checkout, live claim, accepted offer) holds units from
-- this pool and converts them to sold. Status follows the pool:
--   available > 0                 -> available
--   available = 0, units held     -> reserved (comes back if the hold lapses)
--   available = 0, nothing held   -> sold
-- Only listings already in available / reserved / sold are re-statused; drafts, review,
-- hidden and removed listings keep their status.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.listings
  add column if not exists quantity integer not null default 1,
  add column if not exists quantity_sold integer not null default 0,
  add column if not exists quantity_held integer not null default 0;

-- Backfill: a listing that already sold has sold its one unit; active live claims hold units.
update public.listings set quantity_sold = 1 where status = 'sold' and quantity_sold = 0;

update public.listings l
set quantity_held = h.qty
from (
  select listing_id, sum(quantity)::integer as qty
  from public.live_claims
  where status = 'active'
  group by listing_id
) h
where h.listing_id = l.id;

update public.listings
set quantity = greatest(quantity, quantity_sold + quantity_held);

alter table public.listings drop constraint if exists listings_quantity_check;
alter table public.listings
  add constraint listings_quantity_check check (
    quantity between 0 and 999
    and quantity_sold >= 0
    and quantity_held >= 0
    and quantity_sold + quantity_held <= quantity
  );

alter table public.orders
  add column if not exists quantity integer not null default 1,
  add column if not exists unit_price integer;

update public.orders set unit_price = item_price where unit_price is null;

alter table public.orders drop constraint if exists orders_quantity_check;
alter table public.orders add constraint orders_quantity_check check (quantity > 0);

alter table public.offers
  add column if not exists quantity integer not null default 1,
  add column if not exists used_at timestamptz;

alter table public.offers drop constraint if exists offers_quantity_check;
alter table public.offers add constraint offers_quantity_check check (quantity between 1 and 999);

comment on column public.offers.amount is 'Offer price per unit (NGN). Total = amount * quantity.';
comment on column public.offers.used_at is 'Set when an accepted offer has been checked out, so it cannot be reused.';
comment on column public.orders.item_price is 'Line total for the items (unit_price * quantity).';

-- ---------------------------------------------------------------------------
-- Checkout holds (live claims keep using live_claims, which now also hold listing stock)
-- ---------------------------------------------------------------------------

create table if not exists public.stock_holds (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  status text not null default 'active' check (status in ('active', 'converted', 'expired', 'released')),
  source text not null default 'checkout' check (source in ('checkout', 'offer')),
  order_id text references public.orders (id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_holds_listing_idx on public.stock_holds (listing_id);
create index if not exists stock_holds_active_expiry_idx on public.stock_holds (expires_at) where status = 'active';
create index if not exists stock_holds_user_listing_active_idx
  on public.stock_holds (user_id, listing_id) where status = 'active';

drop trigger if exists stock_holds_updated_at on public.stock_holds;
create trigger stock_holds_updated_at before update on public.stock_holds
  for each row execute function public.set_updated_at();

-- Backend (service role) only.
alter table public.stock_holds enable row level security;

alter table public.payment_intents
  add column if not exists stock_hold_id uuid references public.stock_holds (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Stock functions
-- ---------------------------------------------------------------------------

create or replace function public.sync_listing_stock_status(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings
  set status = case
    when quantity - quantity_sold - quantity_held > 0 then 'available'::listing_status
    when quantity_held > 0 then 'reserved'::listing_status
    else 'sold'::listing_status
  end
  where id = p_listing_id
    and status in ('available', 'reserved', 'sold');
end;
$$;

create or replace function public.hold_listing_stock(
  p_listing_id uuid,
  p_user_id uuid,
  p_qty integer,
  p_ttl_seconds integer default 900,
  p_source text default 'checkout'
)
returns public.stock_holds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings;
  v_hold public.stock_holds;
  v_old record;
begin
  if p_qty is null or p_qty < 1 then
    raise exception 'INVALID_QTY' using errcode = 'P0001';
  end if;

  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found then
    raise exception 'LISTING_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_listing.seller_id = p_user_id then
    raise exception 'OWN_LISTING' using errcode = 'P0001';
  end if;
  if v_listing.status not in ('available', 'reserved', 'sold') then
    raise exception 'LISTING_UNAVAILABLE' using errcode = 'P0001';
  end if;

  -- One active checkout hold per buyer per listing: a retry replaces the previous hold.
  for v_old in
    select id from public.stock_holds
    where user_id = p_user_id and listing_id = p_listing_id and status = 'active'
  loop
    perform public.release_stock_hold(v_old.id, 'released');
  end loop;
  select * into v_listing from public.listings where id = p_listing_id;

  if v_listing.quantity - v_listing.quantity_sold - v_listing.quantity_held < p_qty then
    raise exception 'OUT_OF_STOCK' using errcode = 'P0001';
  end if;

  update public.listings set quantity_held = quantity_held + p_qty where id = p_listing_id;

  insert into public.stock_holds (listing_id, user_id, quantity, source, expires_at)
  values (p_listing_id, p_user_id, p_qty, p_source, now() + make_interval(secs => p_ttl_seconds))
  returning * into v_hold;

  perform public.sync_listing_stock_status(p_listing_id);
  return v_hold;
end;
$$;

create or replace function public.release_stock_hold(p_hold_id uuid, p_status text default 'released')
returns public.stock_holds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hold public.stock_holds;
begin
  select * into v_hold from public.stock_holds where id = p_hold_id for update;
  if not found then
    raise exception 'HOLD_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_hold.status <> 'active' then
    return v_hold;
  end if;

  perform 1 from public.listings where id = v_hold.listing_id for update;

  update public.stock_holds
  set status = case when p_status = 'expired' then 'expired' else 'released' end
  where id = p_hold_id
  returning * into v_hold;

  update public.listings
  set quantity_held = greatest(0, quantity_held - v_hold.quantity)
  where id = v_hold.listing_id;

  perform public.sync_listing_stock_status(v_hold.listing_id);
  return v_hold;
end;
$$;

-- Turn a hold into a sale. If the hold already lapsed, the sale still goes through when
-- the units are free; otherwise OUT_OF_STOCK (the payment then needs a refund).
create or replace function public.convert_stock_hold(p_hold_id uuid, p_user_id uuid, p_order_id text default null)
returns public.stock_holds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hold public.stock_holds;
  v_listing public.listings;
begin
  select * into v_hold from public.stock_holds where id = p_hold_id for update;
  if not found then
    raise exception 'HOLD_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_hold.user_id <> p_user_id then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if v_hold.status = 'converted' then
    raise exception 'HOLD_ALREADY_USED' using errcode = 'P0001';
  end if;

  select * into v_listing from public.listings where id = v_hold.listing_id for update;

  if v_hold.status = 'active' then
    update public.listings
    set quantity_held = greatest(0, quantity_held - v_hold.quantity),
        quantity_sold = quantity_sold + v_hold.quantity
    where id = v_hold.listing_id;
  else
    if v_listing.quantity - v_listing.quantity_sold - v_listing.quantity_held < v_hold.quantity then
      raise exception 'OUT_OF_STOCK' using errcode = 'P0001';
    end if;
    update public.listings
    set quantity_sold = quantity_sold + v_hold.quantity
    where id = v_hold.listing_id;
  end if;

  update public.stock_holds
  set status = 'converted', order_id = coalesce(p_order_id, order_id)
  where id = p_hold_id
  returning * into v_hold;

  perform public.sync_listing_stock_status(v_hold.listing_id);
  return v_hold;
end;
$$;

create or replace function public.expire_stale_stock_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select id from public.stock_holds
    where status = 'active' and expires_at < now()
    for update skip locked
  loop
    perform public.release_stock_hold(v_row.id, 'expired');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Put sold units back (order cancelled before dispatch).
create or replace function public.restore_listing_stock(p_listing_id uuid, p_qty integer)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings;
begin
  update public.listings
  set quantity_sold = greatest(0, quantity_sold - greatest(p_qty, 0))
  where id = p_listing_id
  returning * into v_listing;
  if not found then
    raise exception 'LISTING_NOT_FOUND' using errcode = 'P0001';
  end if;
  perform public.sync_listing_stock_status(p_listing_id);
  select * into v_listing from public.listings where id = p_listing_id;
  return v_listing;
end;
$$;

-- Seller changes how many they have. Cannot go below what is already sold or held.
create or replace function public.set_listing_quantity(p_listing_id uuid, p_seller_id uuid, p_quantity integer)
returns public.listings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings;
begin
  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found then
    raise exception 'LISTING_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_listing.seller_id <> p_seller_id then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if p_quantity is null or p_quantity < 0 or p_quantity > 999 then
    raise exception 'INVALID_QTY' using errcode = 'P0001';
  end if;
  if p_quantity < v_listing.quantity_sold + v_listing.quantity_held then
    raise exception 'QUANTITY_TOO_LOW' using errcode = 'P0001';
  end if;

  update public.listings set quantity = p_quantity where id = p_listing_id;
  perform public.sync_listing_stock_status(p_listing_id);
  select * into v_listing from public.listings where id = p_listing_id;
  return v_listing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Live claims now hold listing stock too (same pool as checkout).
-- ---------------------------------------------------------------------------

create or replace function public.expire_live_claim(p_claim_id uuid)
returns public.live_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.live_claims;
begin
  select * into v_claim from public.live_claims where id = p_claim_id for update;
  if not found then
    raise exception 'CLAIM_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_claim.status <> 'active' then
    return v_claim;
  end if;

  update public.live_claims set status = 'expired' where id = p_claim_id returning * into v_claim;

  if v_claim.live_stream_product_id is not null then
    update public.live_stream_products
    set reserved_count = greatest(0, reserved_count - v_claim.quantity)
    where id = v_claim.live_stream_product_id;
  end if;

  update public.listings
  set quantity_held = greatest(0, quantity_held - v_claim.quantity)
  where id = v_claim.listing_id;
  perform public.sync_listing_stock_status(v_claim.listing_id);

  return v_claim;
end;
$$;

create or replace function public.release_live_claim(p_claim_id uuid, p_user_id uuid)
returns public.live_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.live_claims;
begin
  select * into v_claim from public.live_claims where id = p_claim_id for update;
  if not found then
    raise exception 'CLAIM_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_claim.user_id <> p_user_id then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if v_claim.status <> 'active' then
    return v_claim;
  end if;

  update public.live_claims set status = 'released' where id = p_claim_id returning * into v_claim;

  if v_claim.live_stream_product_id is not null then
    update public.live_stream_products
    set reserved_count = greatest(0, reserved_count - v_claim.quantity)
    where id = v_claim.live_stream_product_id;
  end if;

  update public.listings
  set quantity_held = greatest(0, quantity_held - v_claim.quantity)
  where id = v_claim.listing_id;
  perform public.sync_listing_stock_status(v_claim.listing_id);

  return v_claim;
end;
$$;

create or replace function public.convert_live_claim(p_claim_id uuid, p_user_id uuid)
returns public.live_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.live_claims;
begin
  select * into v_claim from public.live_claims where id = p_claim_id for update;
  if not found then
    raise exception 'CLAIM_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_claim.user_id <> p_user_id then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if v_claim.status <> 'active' then
    raise exception 'CLAIM_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  if v_claim.expires_at < now() then
    perform public.expire_live_claim(p_claim_id);
    raise exception 'CLAIM_EXPIRED' using errcode = 'P0001';
  end if;

  update public.live_claims set status = 'converted' where id = p_claim_id returning * into v_claim;

  if v_claim.live_stream_product_id is not null then
    update public.live_stream_products
    set
      reserved_count = greatest(0, reserved_count - v_claim.quantity),
      sold_count = sold_count + v_claim.quantity
    where id = v_claim.live_stream_product_id;
  end if;

  update public.listings
  set quantity_held = greatest(0, quantity_held - v_claim.quantity),
      quantity_sold = quantity_sold + v_claim.quantity
  where id = v_claim.listing_id;
  perform public.sync_listing_stock_status(v_claim.listing_id);

  return v_claim;
end;
$$;

create or replace function public.claim_live_product(
  p_product_id uuid,
  p_user_id uuid,
  p_qty integer default 1,
  p_ttl_seconds integer default 300
)
returns public.live_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.live_stream_products;
  v_listing public.listings;
  v_claim public.live_claims;
  v_existing public.live_claims;
begin
  if p_qty is null or p_qty < 1 then
    raise exception 'INVALID_QTY' using errcode = 'P0001';
  end if;

  select * into v_product from public.live_stream_products where id = p_product_id for update;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into v_existing
  from public.live_claims
  where user_id = p_user_id
    and live_stream_product_id = p_product_id
    and status = 'active'
  for update;

  if found then
    if v_existing.expires_at > now() then
      return v_existing;
    end if;
    perform public.expire_live_claim(v_existing.id);
    select * into v_product from public.live_stream_products where id = p_product_id for update;
  end if;

  select * into v_listing from public.listings where id = v_product.listing_id for update;
  if v_listing.seller_id = p_user_id then
    raise exception 'OWN_LISTING' using errcode = 'P0001';
  end if;

  -- Both the live cap and the listing's own pool must have the units.
  if v_product.stock - v_product.reserved_count - v_product.sold_count < p_qty
     or v_listing.quantity - v_listing.quantity_sold - v_listing.quantity_held < p_qty then
    raise exception 'OUT_OF_STOCK' using errcode = 'P0001';
  end if;

  update public.live_stream_products
  set reserved_count = reserved_count + p_qty
  where id = p_product_id;

  update public.listings
  set quantity_held = quantity_held + p_qty
  where id = v_listing.id;

  insert into public.live_claims (
    live_session_id,
    session_id,
    live_stream_product_id,
    listing_id,
    user_id,
    quantity,
    status,
    expires_at
  )
  values (
    v_product.live_session_id,
    v_product.live_session_id,
    p_product_id,
    v_product.listing_id,
    p_user_id,
    p_qty,
    'active',
    now() + make_interval(secs => p_ttl_seconds)
  )
  returning * into v_claim;

  perform public.sync_listing_stock_status(v_listing.id);
  return v_claim;
end;
$$;

-- ---------------------------------------------------------------------------
-- Listing guard: stock counters are server-managed.
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
    if new.quantity_sold <> 0 or new.quantity_held <> 0 then
      raise exception 'Stock counters are managed by Throve' using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.quantity is distinct from old.quantity
     or new.quantity_sold is distinct from old.quantity_sold
     or new.quantity_held is distinct from old.quantity_held then
    raise exception 'Stock counters are managed by Throve' using errcode = '42501';
  end if;

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

-- ---------------------------------------------------------------------------
-- Grants: backend (service role) only.
-- ---------------------------------------------------------------------------

revoke all on function public.sync_listing_stock_status(uuid) from public, anon, authenticated;
revoke all on function public.hold_listing_stock(uuid, uuid, integer, integer, text) from public, anon, authenticated;
revoke all on function public.release_stock_hold(uuid, text) from public, anon, authenticated;
revoke all on function public.convert_stock_hold(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.expire_stale_stock_holds() from public, anon, authenticated;
revoke all on function public.restore_listing_stock(uuid, integer) from public, anon, authenticated;
revoke all on function public.set_listing_quantity(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.claim_live_product(uuid, uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.convert_live_claim(uuid, uuid) from public, anon, authenticated;
revoke all on function public.expire_live_claim(uuid) from public, anon, authenticated;
revoke all on function public.release_live_claim(uuid, uuid) from public, anon, authenticated;

grant execute on function public.sync_listing_stock_status(uuid) to service_role;
grant execute on function public.hold_listing_stock(uuid, uuid, integer, integer, text) to service_role;
grant execute on function public.release_stock_hold(uuid, text) to service_role;
grant execute on function public.convert_stock_hold(uuid, uuid, text) to service_role;
grant execute on function public.expire_stale_stock_holds() to service_role;
grant execute on function public.restore_listing_stock(uuid, integer) to service_role;
grant execute on function public.set_listing_quantity(uuid, uuid, integer) to service_role;
grant execute on function public.claim_live_product(uuid, uuid, integer, integer) to service_role;
grant execute on function public.convert_live_claim(uuid, uuid) to service_role;
grant execute on function public.expire_live_claim(uuid) to service_role;
grant execute on function public.release_live_claim(uuid, uuid) to service_role;
