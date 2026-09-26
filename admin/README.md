# Throve Admin Console

Vite + React admin console. Staff sign-in uses email/password against the Node API (`POST /auth/staff/login`).

```bash
# from repo root
npm run start:admin
# or
npm run dev --workspace admin
```

Runs on http://localhost:5180

## Staff seed accounts

Create / reset the four Hi-Fi staff users (Auth + `profiles.admin_role`):

```bash
cd backend
STAFF_SEED_PASSWORD='choose-a-strong-password' npm run seed:staff
```

| Role | Email |
|------|-------|
| Super Admin | `okafor@throve.store` |
| Trust & Safety | `safety@throve.store` |
| Customer Support | `support@throve.store` |
| Finance | `finance@throve.store` |

All four share `STAFF_SEED_PASSWORD`. Share it out of band; never commit it.

In local dev (`npm run dev`), the login page shows "Fill" buttons. Set `VITE_STAFF_DEMO_PASSWORD` in `admin/.env.local` to have them fill the password too. The buttons are not rendered in production builds.
