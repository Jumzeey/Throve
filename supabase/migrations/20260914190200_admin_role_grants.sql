-- Grant staff console access by setting profiles.admin_role.
-- Null admin_role = normal customer (cannot sign in to admin).
-- Runs safely if the profile row does not exist yet (0 rows updated).

update public.profiles
set admin_role = 'super_admin'
where lower(email) = lower('adeogun64@gmail.com');
