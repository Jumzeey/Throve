-- Admin moderation for seller ratings (buyer reviews).

alter table public.reviews
  add column if not exists comment_hidden boolean not null default false,
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.profiles (id),
  add column if not exists escalated_at timestamptz;

create index if not exists reviews_created_at_idx
  on public.reviews (created_at desc);

create index if not exists reviews_comment_hidden_idx
  on public.reviews (comment_hidden)
  where comment_hidden = true;

create index if not exists reviews_order_id_idx
  on public.reviews (order_id)
  where order_id is not null;

create index if not exists reviews_escalated_idx
  on public.reviews (escalated_at)
  where escalated_at is not null;

create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  action text not null
    check (action in ('note', 'escalated', 'comment_hidden', 'received')),
  reason text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists review_events_review_idx
  on public.review_events (review_id, created_at desc);

comment on table public.review_events is
  'Staff history for seller review moderation; also write admin_audit_log on mutations.';

comment on column public.reviews.comment_hidden is
  'When true, public APIs omit comment text; star rating is retained in averages.';
