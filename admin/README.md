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

The login page shows "Fill" buttons for each staff account. They fill the password from `VITE_STAFF_DEMO_PASSWORD`, set in `admin/.env.local` locally and in the Vercel project env for deployed builds. It's a build-time value, so redeploy after changing it. Without it, the buttons fill only the email.
