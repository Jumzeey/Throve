-- Soft-delete status so saved items can show "removed by seller" after delete.
alter type public.listing_status add value if not exists 'removed';
