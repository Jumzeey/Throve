-- Preserve the buyer's prior amount when a seller counters an offer.
alter table public.offers
  add column if not exists previous_amount integer;
