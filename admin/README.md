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
npm run seed:staff
```

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `okafor@throve.store` | `ThroveAdmin!2026` |
| Trust & Safety | `safety@throve.store` | `ThroveAdmin!2026` |
| Customer Support | `support@throve.store` | `ThroveAdmin!2026` |
| Finance | `finance@throve.store` | `ThroveAdmin!2026` |

Override password with `STAFF_SEED_PASSWORD` when running the seed script. Dev/staging only — rotate before production.
