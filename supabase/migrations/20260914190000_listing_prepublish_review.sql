-- Step 1: add enum values (must commit before use in indexes/policies).
alter type public.listing_status add value if not exists 'pending_review';
alter type public.listing_status add value if not exists 'rejected';

do $$ begin
  create type public.admin_role as enum ('super_admin', 'trust_safety', 'support', 'finance');
exception
  when duplicate_object then null;
end $$;
