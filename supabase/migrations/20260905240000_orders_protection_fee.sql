-- Buyer Protection fee and optional accepted-offer checkout linkage.
alter table public.orders
  add column if not exists protection_fee integer not null default 0,
  add column if not exists listed_price integer,
  add column if not exists offer_id uuid references public.offers(id) on delete set null;
