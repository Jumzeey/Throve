-- Let buyers/sellers receive offer status changes (accept → Buy now) without leaving chat.
do $$
begin
  alter publication supabase_realtime add table public.offers;
exception
  when duplicate_object then null;
end $$;
