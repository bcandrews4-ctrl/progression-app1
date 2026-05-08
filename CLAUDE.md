# CLAUDE.md — Gym Progression App

## Tech Stack
- **Frontend**: React 18 + TypeScript, Vite, Lucide icons, Recharts
- **Desktop**: Electron wrapper (`npm run electron:dev`)
- **Backend/DB**: Supabase (Postgres + Auth + RLS + Edge Functions via Deno)
- **Mobile bridge**: React Native in `GymProgressionMobile/`; native HealthKit bridge in `ios/HealthBridge/` (Swift)
- **Deploy**: Vercel (web); `supabase functions deploy` for edge functions

## Key Files

| Path | Purpose |
|---|---|
| `src/App.tsx` | Single-file React app (~4000 lines); all views, state, and UI |
| `src/lib/db.ts` | All Supabase query functions and TypeScript types |
| `src/lib/supabase.ts` | Supabase client init |
| `supabase/functions/ingest-health/index.ts` | Edge function — accepts health metrics + workouts via Bearer sync_token |
| `supabase/migration-relational.sql` | Full schema: lifts, cardio_entries, run_entries, imported_workouts, health_metrics |
| `supabase/migrations/add_sync_token.sql` | Adds sync_token UUID column to profiles |
| `ios/HealthBridge/` | Swift HealthKit→API bridge (APIClient, HealthKitManager, Models) |
| `docs/README-health-sync.md` | Apple Health sync architecture reference |

## Common Commands

```powershell
npm run dev                                  # Vite dev server (web)
npm run build                                # Production build
npm run typecheck                            # tsc --noEmit
npm run electron:dev                         # Build + run Electron desktop app
supabase functions serve ingest-health       # Local edge function dev
supabase functions deploy ingest-health      # Deploy edge function to production
```

## Supabase Project

- Project URL: `https://fjfyglqsnbhhclbbdllu.supabase.co`
- Edge function endpoint: `POST /functions/v1/ingest-health`
- Auth: `Authorization: Bearer <sync_token>` (UUID stored in `profiles.sync_token`)

## Data Model

| Table | Key Columns |
|---|---|
| `profiles` | id, role, training_focus, sync_token uuid |
| `lifts` | user_id, date_iso, lift, weight_kg, reps, rpe |
| `cardio_entries` | user_id, date_iso, machine, seconds, calories |
| `run_entries` | user_id, date_iso, distance_meters, time_seconds |
| `imported_workouts` | id (text PK = HealthKit UUID), user_id, workout_type, minutes |
| `health_metrics` | user_id, date_iso (unique together), steps, sleep_hours, avg_bpm, calories_burned |

## RLS

All tables enforce Row Level Security — users can only read/write their own rows. Admins (`profiles.role = 'admin'`) have an additional SELECT policy. The `ingest-health` edge function uses the service role key to bypass RLS after validating ownership via `sync_token`.

## Apple Health Sync

See `docs/README-health-sync.md` for the full architecture. Short version: iPhone → `ingest-health` edge function (Bearer sync_token) → upsert into `health_metrics` + `imported_workouts`. Token displayed in Profile → Apple Health Sync.
