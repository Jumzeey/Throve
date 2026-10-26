-- Home banners: the carousel at the top of the app's Home tab, managed by super admins
-- from the admin console. Reads and writes go through the backend (service role).

create table if not exists public.home_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 40),
  subtitle text check (subtitle is null or char_length(subtitle) <= 80),
  cta_label text check (cta_label is null or char_length(cta_label) <= 20),
  -- Where tapping the slide goes. target_value holds the department, listing id, live id,
  -- username, search term or https URL, depending on target_type.
  target_type text not null default 'category_browse' check (
    target_type in ('category_browse', 'department', 'listing', 'live', 'seller', 'search', 'url')
  ),
  target_value text,
  image_url text,
  theme text not null default 'plum' check (theme in ('plum', 'espresso', 'gold', 'sand')),
  sort_order integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (target_type = 'category_browse' or coalesce(target_value, '') <> '')
);

create index if not exists home_banners_live_idx on public.home_banners (active, sort_order);

drop trigger if exists home_banners_updated_at on public.home_banners;
create trigger home_banners_updated_at before update on public.home_banners
  for each row execute function public.set_updated_at();

-- Backend only: no client policies.
alter table public.home_banners enable row level security;

-- Banner images: public read, uploads only through the backend (service role bypasses RLS).
insert into storage.buckets (id, name, public)
values ('marketing-banners', 'marketing-banners', true)
on conflict (id) do nothing;

drop policy if exists "Public read marketing banners" on storage.objects;
create policy "Public read marketing banners"
on storage.objects for select
to public
using (bucket_id = 'marketing-banners');

-- First slide = today's hard-coded banner, so Home looks the same on day one.
insert into public.home_banners (title, subtitle, cta_label, target_type, theme, sort_order)
select 'Curated finds. Loved again.', 'Timeless style, from closets across Nigeria.', 'Shop now', 'category_browse', 'plum', 0
where not exists (select 1 from public.home_banners);
