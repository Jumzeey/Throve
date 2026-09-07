-- Per-message delivery / read receipts for chat ticks
alter table public.messages
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;

comment on column public.messages.delivered_at is 'When the recipient device first received the message';
comment on column public.messages.read_at is 'When the recipient opened the conversation and saw the message';

create index if not exists messages_receipts_idx
  on public.messages (conversation_id, sender_id)
  where delivered_at is null or read_at is null;

-- Realtime for live chat (INSERT/UPDATE for new messages + receipt ticks)
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

-- Legacy backfill: replied-to messages were already seen
update public.messages m
set
  delivered_at = coalesce(m.delivered_at, m.created_at),
  read_at = coalesce(m.read_at, m.created_at)
where m.read_at is null
  and exists (
    select 1
    from public.messages r
    where r.conversation_id = m.conversation_id
      and r.sender_id <> m.sender_id
      and r.created_at > m.created_at
  );

-- Legacy backfill: no unread row for the recipient ⇒ they already opened the thread
update public.messages m
set
  delivered_at = coalesce(m.delivered_at, m.created_at),
  read_at = coalesce(m.read_at, m.created_at)
where m.read_at is null
  and not exists (
    select 1
    from public.conversation_unread u
    where u.conversation_id = m.conversation_id
      and u.user_id <> m.sender_id
  );
