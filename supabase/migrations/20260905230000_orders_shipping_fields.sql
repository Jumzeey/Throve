-- Optional structured shipping fields collected at checkout.
alter table public.orders
  add column if not exists state text,
  add column if not exists delivery_note text;
