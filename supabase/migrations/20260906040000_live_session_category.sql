-- Category label for live discovery chips (e.g. Bags alongside department Women).
alter table public.live_sessions
  add column if not exists category text;
