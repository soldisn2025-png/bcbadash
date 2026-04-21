# BCBA Dash

A BCBA fieldwork dashboard for tracking restricted vs unrestricted hours, comparing actual pace against a user-defined goal date, and projecting realistic completion dates from historical data.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Current persistence behavior

- If `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set, the app loads and saves data to Supabase.
- If those env vars are missing or Supabase is unavailable, the app falls back to browser local storage.
- A local cache is always kept so edits are not lost during a temporary backend issue.
- If Supabase is configured, the app expects email magic-link authentication before showing the dashboard.

## Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

3. In the Supabase SQL editor, run [supabase/schema.sql](./supabase/schema.sql).
4. In Supabase Auth:
   - enable email sign-in
   - add `http://localhost:3000` to your allowed redirect URLs for local development
5. Start the app and sign in with a magic link.
6. On first sign-in, the app automatically calls `bootstrap_default_household()` to create the default `Wife` and `Sol` profiles for that signed-in user.

## Row-level security

The schema enables RLS and scopes data to the signed-in Supabase user through `owner_user_id`. That means:

- each signed-in user gets their own household data
- the anon key can still be used safely from the client
- the app can keep using browser-only mutations without exposing other users' rows

## Key files

- [src/lib/domain/progress.ts](./src/lib/domain/progress.ts): BACB-aware calculations and forecasting
- [src/lib/db/queries.ts](./src/lib/db/queries.ts): persistence entry points and fallback logic
- [src/lib/db/mappers.ts](./src/lib/db/mappers.ts): app state to database row mapping
- [src/components/dashboard-shell.tsx](./src/components/dashboard-shell.tsx): app state orchestration

## Verification

```bash
npm run lint
npm run test:run
npm run build
```

## Note about builds on this machine

This repo lives under a Windows path containing non-ASCII characters (`바탕 화면`). Next.js 16 Turbopack currently crashes in production builds in this path, so the project uses:

```bash
next build --webpack
```

for reliable production builds in this workspace.
