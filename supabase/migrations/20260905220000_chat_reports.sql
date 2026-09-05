-- User and message reports from inbox chat.
create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_username text not null,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  kind text not null check (kind in ('user', 'message')),
  created_at timestamptz not null default now()
);

create index if not exists chat_reports_reporter_idx on public.chat_reports (reporter_id);

alter table public.chat_reports enable row level security;

create policy "Users can create chat reports"
  on public.chat_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "Users can view own chat reports"
  on public.chat_reports for select
  to authenticated
  using (reporter_id = auth.uid());
