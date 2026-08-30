-- Live commerce: LiveKit + live_stream_products + atomic claims
-- Apply after 20260820000000_initial_schema.sql / 20260820000001_storage_buckets.sql

do $$ begin
  create type live_claim_status as enum ('active', 'converted', 'expired', 'released');
exception when duplicate_object then null;
end $$;

alter table public.live_sessions
  add column if not exists livekit_room_name text,
  add column if not exists thumbnail_url text,
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz;

create unique index if not exists live_sessions_livekit_room_name_uidx
  on public.live_sessions (livekit_room_name)
  where livekit_room_name is not null;

update public.live_sessions
set livekit_room_name = 'live_' || id::text
where livekit_room_name is null;

create table if not exists public.live_stream_products (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  live_price integer not null check (live_price >= 0),
  stock integer not null check (stock >= 0),
  reserved_count integer not null default 0 check (reserved_count >= 0),
  sold_count integer not null default 0 check (sold_count >= 0),
  is_pinned boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (live_session_id, listing_id),
  check (reserved_count + sold_count <= stock)
);

create index if not exists live_stream_products_session_idx
  on public.live_stream_products (live_session_id);

drop trigger if exists live_stream_products_updated_at on public.live_stream_products;
create trigger live_stream_products_updated_at
  before update on public.live_stream_products
  for each row execute function public.set_updated_at();

create unique index if not exists live_stream_products_one_pin_per_session
  on public.live_stream_products (live_session_id)
  where is_pinned = true;

alter table public.live_claims drop constraint if exists live_claims_listing_id_key;

alter table public.live_claims
  add column if not exists live_stream_product_id uuid references public.live_stream_products(id) on delete cascade,
  add column if not exists quantity integer not null default 1 check (quantity > 0),
  add column if not exists status live_claim_status not null default 'active',
  add column if not exists live_session_id uuid references public.live_sessions(id) on delete cascade;

update public.live_claims
set live_session_id = session_id
where live_session_id is null and session_id is not null;

create unique index if not exists live_claims_one_active_per_user_product
  on public.live_claims (user_id, live_stream_product_id)
  where status = 'active' and live_stream_product_id is not null;

create index if not exists live_claims_product_idx on public.live_claims (live_stream_product_id);
create index if not exists live_claims_expires_idx on public.live_claims (expires_at)
  where status = 'active';

alter table public.orders
  add column if not exists live_stream_product_id uuid references public.live_stream_products(id) on delete set null,
  add column if not exists claim_id uuid references public.live_claims(id) on delete set null;

alter table public.live_comments
  add column if not exists client_id text;

alter table public.live_stream_products enable row level security;

drop policy if exists "Public can view live stream products" on public.live_stream_products;
create policy "Public can view live stream products" on public.live_stream_products
  for select using (true);

drop policy if exists "Hosts insert live stream products" on public.live_stream_products;
create policy "Hosts insert live stream products" on public.live_stream_products
  for insert with check (
    exists (
      select 1 from public.live_sessions s
      where s.id = live_session_id and s.host_id = auth.uid()
    )
  );

drop policy if exists "Hosts update live stream products" on public.live_stream_products;
create policy "Hosts update live stream products" on public.live_stream_products
  for update using (
    exists (
      select 1 from public.live_sessions s
      where s.id = live_session_id and s.host_id = auth.uid()
    )
  );

drop policy if exists "Users can view claims" on public.live_claims;
create policy "Users can view claims" on public.live_claims
  for select using (true);

do $$ begin
  alter publication supabase_realtime add table public.live_comments;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.live_stream_products;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.live_claims;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

create or replace function public.pin_live_product(p_product_id uuid, p_user_id uuid)
returns public.live_stream_products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.live_stream_products;
  v_session public.live_sessions;
begin
  select * into v_product from public.live_stream_products where id = p_product_id for update;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into v_session from public.live_sessions where id = v_product.live_session_id;
  if v_session.host_id <> p_user_id then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  update public.live_stream_products
  set is_pinned = false
  where live_session_id = v_product.live_session_id and is_pinned = true;

  update public.live_stream_products
  set is_pinned = true
  where id = p_product_id
  returning * into v_product;

  update public.live_sessions
  set pinned_listing_id = v_product.listing_id
  where id = v_product.live_session_id;

  return v_product;
end;
$$;

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
  v_available integer;
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
    update public.live_claims set status = 'expired' where id = v_existing.id;
    update public.live_stream_products
    set reserved_count = greatest(0, reserved_count - v_existing.quantity)
    where id = p_product_id;
    select * into v_product from public.live_stream_products where id = p_product_id for update;
  end if;

  v_available := v_product.stock - v_product.reserved_count - v_product.sold_count;
  if v_available < p_qty then
    raise exception 'OUT_OF_STOCK' using errcode = 'P0001';
  end if;

  update public.live_stream_products
  set reserved_count = reserved_count + p_qty
  where id = p_product_id;

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

  return v_claim;
end;
$$;

create or replace function public.expire_stale_live_claims()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim record;
  v_count integer := 0;
begin
  for v_claim in
    select id from public.live_claims
    where status = 'active' and expires_at < now()
    for update skip locked
  loop
    perform public.expire_live_claim(v_claim.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.pin_live_product(uuid, uuid) from public;
revoke all on function public.claim_live_product(uuid, uuid, integer, integer) from public;
revoke all on function public.release_live_claim(uuid, uuid) from public;
revoke all on function public.convert_live_claim(uuid, uuid) from public;
revoke all on function public.expire_live_claim(uuid) from public;
revoke all on function public.expire_stale_live_claims() from public;

grant execute on function public.pin_live_product(uuid, uuid) to service_role;
grant execute on function public.claim_live_product(uuid, uuid, integer, integer) to service_role;
grant execute on function public.release_live_claim(uuid, uuid) to service_role;
grant execute on function public.convert_live_claim(uuid, uuid) to service_role;
grant execute on function public.expire_live_claim(uuid) to service_role;
grant execute on function public.expire_stale_live_claims() to service_role;
