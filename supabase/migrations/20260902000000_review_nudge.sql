-- Track review nudge emails so completed orders are only nudged once.
alter table public.orders
  add column if not exists review_nudge_sent boolean not null default false;

create index if not exists orders_review_nudge_idx
  on public.orders (status, reviewed, review_nudge_sent, updated_at)
  where status = 'completed' and reviewed = false and review_nudge_sent = false;
