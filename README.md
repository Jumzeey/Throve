# Throve Monorepo

## Structure

- `frontend/` — Expo React Native app (Supabase Auth direct; all data via Node API)
- `backend/` — Express API (talks to Supabase with user JWT + RLS)
- `supabase/migrations/` — Postgres schema, RLS, triggers

## Setup

### 1. Supabase

1. Create or open your Supabase project
2. Run migrations in order (SQL editor or `supabase db push`):
   - `supabase/migrations/20260820000000_initial_schema.sql`
   - `supabase/migrations/20260820000001_storage_buckets.sql`
   - `supabase/migrations/20260820000002_live_commerce.sql`
3. Enable Realtime for `live_comments`, `live_stream_products`, `live_claims`
4. Enable **Email magic link** auth
5. Add redirect URL: `throveapp://auth/callback`
6. Copy project URL, anon key, and **service role** key into env files

### LiveKit (live video)

1. Create a LiveKit Cloud project
2. Set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` in `backend/.env`
3. Use a **dev client / prebuild** for the app (LiveKit WebRTC does not run in Expo Go):

```bash
cd frontend
npx expo prebuild
npx expo run:ios   # or run:android
```

### Claim concurrency smoke test

```bash
ACCESS_TOKEN=... SESSION_ID=... PRODUCT_ID=... CONCURRENCY=50 \
  node backend/scripts/stress-claim.mjs
```

## Architecture

```
Mobile App
  ├─ Auth → Supabase Auth (magic link)
  ├─ Video → LiveKit Cloud (token from Express)
  ├─ Live events → Supabase Realtime (comments, pin, stock, claims)
  └─ Commerce → Express API → Postgres RPCs (atomic claims)
```

## CI

Codemagic builds from `frontend/` — see root `codemagic.yaml`.
