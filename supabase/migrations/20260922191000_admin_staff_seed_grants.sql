-- Grant staff console access for seeded Hi-Fi personas.
-- Auth users + passwords are created by: backend `npm run seed:staff`
-- Password (default): ThroveAdmin!2026

update public.profiles
set admin_role = 'super_admin', admin_active = true
where lower(email) = lower('okafor@throve.store');

update public.profiles
set admin_role = 'trust_safety', admin_active = true
where lower(email) = lower('safety@throve.store');

update public.profiles
set admin_role = 'support', admin_active = true
where lower(email) = lower('support@throve.store');

update public.profiles
set admin_role = 'finance', admin_active = true
where lower(email) = lower('finance@throve.store');

-- Keep existing founder grant
update public.profiles
set admin_role = 'super_admin', admin_active = true
where lower(email) = lower('adeogun64@gmail.com');
