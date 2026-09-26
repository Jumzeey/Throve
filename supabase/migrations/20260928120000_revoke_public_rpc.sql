-- Live claim RPCs take a caller-supplied user id; only the backend (service role) may call them.
revoke execute on function public.claim_live_product(uuid, uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.convert_live_claim(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.expire_live_claim(uuid) from public, anon, authenticated;
revoke execute on function public.expire_stale_live_claims() from public, anon, authenticated;
revoke execute on function public.pin_live_product(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.release_live_claim(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.set_live_claim_expires_at(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.claim_live_product(uuid, uuid, integer, integer) to service_role;
grant execute on function public.convert_live_claim(uuid, uuid) to service_role;
grant execute on function public.expire_live_claim(uuid) to service_role;
grant execute on function public.expire_stale_live_claims() to service_role;
grant execute on function public.pin_live_product(uuid, uuid) to service_role;
grant execute on function public.release_live_claim(uuid, uuid) to service_role;
grant execute on function public.set_live_claim_expires_at(uuid, timestamptz) to service_role;

alter function public.set_updated_at() set search_path = public;
