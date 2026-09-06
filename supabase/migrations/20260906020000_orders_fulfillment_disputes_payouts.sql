-- Split: enum value must be committed before use (see 20260906020100_...)
alter type public.order_status add value if not exists 'delivered';
