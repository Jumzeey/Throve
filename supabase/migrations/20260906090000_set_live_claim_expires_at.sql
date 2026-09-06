-- Allow service role to adjust claim expiry for ops/tests; used by E2E and support tooling.
create or replace function public.set_live_claim_expires_at(
  p_claim_id uuid,
  p_expires_at timestamptz
)
returns public.live_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.live_claims;
begin
  update public.live_claims
  set expires_at = p_expires_at
  where id = p_claim_id
  returning * into v_claim;

  if not found then
    raise exception 'CLAIM_NOT_FOUND' using errcode = 'P0001';
  end if;

  return v_claim;
end;
$$;

revoke all on function public.set_live_claim_expires_at(uuid, timestamptz) from public;
grant execute on function public.set_live_claim_expires_at(uuid, timestamptz) to service_role;
