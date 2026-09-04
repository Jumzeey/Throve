-- Chat image attachments on messages
alter table public.messages
  add column if not exists image_url text;

comment on column public.messages.image_url is 'Optional public URL for an image attached to the message';

-- Allow image-only messages (empty text)
alter table public.messages
  alter column text set default '';

-- Storage for chat images
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

create policy "Users upload chat images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Public read chat images"
on storage.objects for select
to public
using (bucket_id = 'chat-images');

create policy "Users update own chat images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
