-- Admin ledgers and event logs are backend-only (service role bypasses RLS).
-- Enabling RLS with no policies closes them to anon/authenticated Data API access.

alter table public.admin_audit_log enable row level security;
alter table public.dispute_events enable row level security;
alter table public.refunds enable row level security;
alter table public.refund_events enable row level security;
alter table public.payouts enable row level security;
alter table public.payout_events enable row level security;
alter table public.payment_events enable row level security;
alter table public.order_events enable row level security;
alter table public.user_events enable row level security;
alter table public.report_events enable row level security;
alter table public.live_events enable row level security;
alter table public.review_events enable row level security;
