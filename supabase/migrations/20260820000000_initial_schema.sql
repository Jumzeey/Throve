-- Throve initial schema
-- Apply via Supabase CLI or dashboard SQL editor

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type listing_status as enum ('available', 'reserved', 'sold', 'draft', 'hidden');
create type live_status as enum ('live', 'upcoming', 'ended');
create type offer_status as enum ('pending', 'accepted', 'rejected', 'withdrawn', 'expired');
create type order_status as enum ('paid', 'dispatched', 'in_transit', 'completed', 'cancelled');
create type delivery_method as enum ('Standard', 'Express');
create type department as enum ('Women', 'Men', 'Kids');

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  username text unique not null,
  dob text,
  bio text not null default '',
  location text not null default '',
  photo_url text,
  phone text,
  setup_complete boolean not null default false,
  can_host_live boolean not null default false,
  deactivated boolean not null default false,
  notif_offers boolean not null default true,
  notif_messages boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_username_idx on public.profiles (username);

-- Listings
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  brand text not null default 'Unbranded',
  price integer not null default 0,
  size text not null default '—',
  condition text not null default 'Good',
  department department not null,
  category text not null,
  status listing_status not null default 'draft',
  description text not null default '',
  shipping text not null default 'Buyer pays shipping · 3–5 days within Nigeria',
  colour text,
  photo_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_seller_idx on public.listings (seller_id);
create index listings_status_idx on public.listings (status);
create index listings_department_idx on public.listings (department);

-- Saved listings
create table public.saved_listings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- Live sessions
create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  status live_status not null default 'upcoming',
  viewers integer,
  scheduled_at text,
  pinned_listing_id uuid references public.listings(id) on delete set null,
  department department,
  description text,
  featured_listing_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index live_sessions_status_idx on public.live_sessions (status);

-- Live comments
create table public.live_comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index live_comments_session_idx on public.live_comments (session_id);

-- Live claims / reservations
create table public.live_claims (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (listing_id)
);

-- Offers
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  status offer_status not null default 'pending',
  initiator text not null check (initiator in ('buyer', 'seller')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index offers_listing_idx on public.offers (listing_id);
create index offers_buyer_idx on public.offers (buyer_id);
create index offers_seller_idx on public.offers (seller_id);

-- Blocked users
create table public.blocked_users (
  user_id uuid not null references public.profiles(id) on delete cascade,
  blocked_username text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_username)
);

-- Conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  last_message text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (listing_id, participant_a, participant_b)
);

create index conversations_updated_idx on public.conversations (updated_at desc);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id);

-- Conversation unread tracking
create table public.conversation_unread (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

-- Orders
create table public.orders (
  id text primary key,
  listing_id uuid not null references public.listings(id) on delete restrict,
  listing_title text not null,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  address text not null,
  city text not null,
  phone text not null,
  delivery_method delivery_method not null default 'Standard',
  delivery_fee integer not null default 0,
  item_price integer not null,
  total integer not null,
  from_live_id uuid references public.live_sessions(id) on delete set null,
  status order_status not null default 'paid',
  reviewed boolean not null default false,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_buyer_idx on public.orders (buyer_id);
create index orders_seller_idx on public.orders (seller_id);

-- Reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  order_id text references public.orders(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

create index reviews_seller_idx on public.reviews (seller_id);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();
create trigger live_sessions_updated_at before update on public.live_sessions
  for each row execute function public.set_updated_at();
create trigger offers_updated_at before update on public.offers
  for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.saved_listings enable row level security;
alter table public.live_sessions enable row level security;
alter table public.live_comments enable row level security;
alter table public.live_claims enable row level security;
alter table public.offers enable row level security;
alter table public.blocked_users enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_unread enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;

-- Profiles policies
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (not deactivated);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Listings policies
create policy "Public can view non-draft listings" on public.listings
  for select using (status in ('available', 'reserved', 'sold', 'hidden') or seller_id = auth.uid());
create policy "Sellers can insert own listings" on public.listings
  for insert with check (seller_id = auth.uid());
create policy "Sellers can update own listings" on public.listings
  for update using (seller_id = auth.uid());
create policy "Sellers can delete own draft listings" on public.listings
  for delete using (seller_id = auth.uid() and status = 'draft');

-- Saved listings
create policy "Users manage own saves" on public.saved_listings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Live sessions
create policy "Public can view live sessions" on public.live_sessions
  for select using (true);
create policy "Hosts manage own sessions" on public.live_sessions
  for all using (host_id = auth.uid()) with check (host_id = auth.uid());

-- Live comments
create policy "Public can read live comments" on public.live_comments
  for select using (true);
create policy "Authenticated users can comment" on public.live_comments
  for insert with check (auth.uid() = user_id);

-- Live claims
create policy "Users can view claims" on public.live_claims
  for select using (true);
create policy "Users can create claims" on public.live_claims
  for insert with check (auth.uid() = user_id);

-- Offers
create policy "Participants can view offers" on public.offers
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Participants can create offers" on public.offers
  for insert with check (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Participants can update offers" on public.offers
  for update using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Blocked users
create policy "Users manage own blocks" on public.blocked_users
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Conversations
create policy "Participants can view conversations" on public.conversations
  for select using (auth.uid() = participant_a or auth.uid() = participant_b);
create policy "Participants can create conversations" on public.conversations
  for insert with check (auth.uid() = participant_a or auth.uid() = participant_b);
create policy "Participants can update conversations" on public.conversations
  for update using (auth.uid() = participant_a or auth.uid() = participant_b);

-- Messages
create policy "Participants can view messages" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );
create policy "Participants can send messages" on public.messages
  for insert with check (
    auth.uid() = sender_id and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- Conversation unread
create policy "Users manage own unread" on public.conversation_unread
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Orders
create policy "Participants can view orders" on public.orders
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Buyers can create orders" on public.orders
  for insert with check (auth.uid() = buyer_id);
create policy "Participants can update orders" on public.orders
  for update using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Reviews
create policy "Public can view reviews" on public.reviews
  for select using (true);
create policy "Buyers can create reviews" on public.reviews
  for insert with check (auth.uid() = buyer_id);

-- Storage buckets (run in dashboard or via storage API)
-- insert into storage.buckets (id, name, public) values ('profile-photos', 'profile-photos', true);
-- insert into storage.buckets (id, name, public) values ('listing-photos', 'listing-photos', true);
