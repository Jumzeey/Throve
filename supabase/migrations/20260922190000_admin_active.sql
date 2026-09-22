-- Staff console: allow Soft Admin to deactivate access without clearing admin_role.
-- Null admin_role = never provisioned. admin_active = false = revoked / inactive.

alter table public.profiles
  add column if not exists admin_active boolean not null default true;

comment on column public.profiles.admin_active is
  'When false, staff with an admin_role cannot sign in to the admin console (ACCESS_REVOKED).';
