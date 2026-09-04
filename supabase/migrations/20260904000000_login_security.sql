-- Preferred sign-in method + whether a password has been set on the auth user.
alter table public.profiles
  add column if not exists preferred_login_method text not null default 'password'
    check (preferred_login_method in ('password', 'magic_link')),
  add column if not exists has_password boolean not null default false;

comment on column public.profiles.preferred_login_method is
  'User preference for sign-in UI: password (default) or magic_link.';
comment on column public.profiles.has_password is
  'True once the user has set an auth password (signup or OTP setup).';
