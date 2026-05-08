# Apple Health Sync — Architecture Reference

## Overview

Health data flows from Apple HealthKit on-device → a Supabase Edge Function → two Postgres tables (`health_metrics` and `imported_workouts`). Authentication uses a per-user `sync_token` UUID stored in `profiles`, not a session cookie, so it works from background iOS processes and Apple Shortcuts without OAuth.

## Data Flow

```
iPhone / Apple Watch
      │
      │  HealthKit read
      ▼
HealthBridge Swift app  (or Apple Shortcut)
      │
      │  POST /functions/v1/ingest-health
      │  Authorization: Bearer <sync_token>
      │  Body: { metrics: [...], workouts: [...] }
      ▼
Supabase Edge Function (Deno)
  1. Validate Bearer token → look up user_id in profiles.sync_token
  2. Upsert metrics rows  → health_metrics  (unique on user_id + date_iso)
  3. Upsert workout rows  → imported_workouts (unique on id = externalId)
      │
      ▼
Postgres (service role key — bypasses RLS)
  - health_metrics
  - imported_workouts
      │
      ▼
React web app reads via supabase-js (user session, RLS enforced)
  - fetchHealth()   → healthData state
  - fetchImported() → imported state
```

## Endpoint

```
POST https://fjfyglqsnbhhclbbdllu.supabase.co/functions/v1/ingest-health
Authorization: Bearer <sync_token>
Content-Type: application/json
```

## Request Body Schema

Both arrays are optional. Either can be empty or omitted.

```json
{
  "metrics": [
    {
      "dateISO": "2025-01-01",
      "steps": 8432,
      "sleepHours": 7.2,
      "sleepStages": [
        { "stage": "Deep",  "minutes": 98  },
        { "stage": "REM",   "minutes": 112 },
        { "stage": "Core",  "minutes": 220 },
        { "stage": "Awake", "minutes": 15  }
      ],
      "avgBPM": 61,
      "caloriesBurned": 2050,
      "activeMinutes": 48
    }
  ],
  "workouts": [
    {
      "externalId":  "550e8400-e29b-41d4-a716-446655440000",
      "source":      "Apple Health",
      "type":        "Running",
      "startTime":   "2025-01-01T07:00:00.000Z",
      "endTime":     "2025-01-01T07:45:00.000Z",
      "calories":    420,
      "distanceKm":  6.5
    }
  ]
}
```

## Response

```json
{ "upserted": 1, "workoutsUpserted": 1 }
```

| Status | Meaning |
|---|---|
| 200 | Success — check `upserted` / `workoutsUpserted` counts |
| 400 | Body is not valid JSON |
| 401 | Missing or unknown sync_token |
| 405 | Non-POST request |
| 500 | Database error — message included in body |

## Idempotency

- **metrics**: upsert conflicts on `(user_id, date_iso)` — re-syncing the same day overwrites with the latest values.
- **workouts**: upsert conflicts on `id` (= `externalId` = HealthKit UUID string) — re-syncing the same workout is a no-op on all fields.

## Authentication Model

`sync_token` is a UUID generated once per user (`gen_random_uuid()`) stored in `profiles`. It is displayed in Profile → Apple Health Sync in the web app. It is not a session token — it does not expire and does not grant web app access. To revoke, a "Regenerate token" feature would run `UPDATE profiles SET sync_token = gen_random_uuid() WHERE id = auth.uid()`.

## Integration Options

### Option A: HealthBridge iOS App (Recommended)

Build the Swift project in `ios/HealthBridge/` in Xcode:

1. Enable HealthKit capability in the target.
2. Add `NSHealthShareUsageDescription` to `Info.plist`.
3. Paste your sync token into the app settings.
4. Tap Sync — or enable background delivery for automatic daily sync.

The app sends both `workouts` and daily `metrics` in a single POST.

### Option B: Apple Shortcuts (No-code)

1. Open Shortcuts → New Shortcut → Add action "Get Contents of URL".
2. Set URL to the endpoint above. Method: POST.
3. Add headers: `Authorization: Bearer <your_sync_token>` and `Content-Type: application/json`.
4. Set Request Body to JSON and paste a template with today's date and metric values.
5. Add to Automations → Time of Day → Daily at midnight.

> **Note:** Apple Shortcuts cannot natively read HealthKit aggregates and POST them in one action without scripting. For full automation on iOS 17+, chain "Health → Get Health Sample" actions feeding into the URL action.

## Table Schemas

### `health_metrics`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, auto-generated |
| user_id | uuid | FK → auth.users |
| date_iso | text | YYYY-MM-DD, UNIQUE with user_id |
| steps | integer | |
| sleep_hours | numeric | |
| sleep_stages | jsonb | `[{ stage, minutes }]` |
| avg_bpm | integer | |
| calories_burned | integer | |
| active_minutes | integer | |

### `imported_workouts`

| Column | Type | Notes |
|---|---|---|
| id | text | PK = HealthKit UUID (externalId) |
| user_id | uuid | FK → auth.users |
| date_iso | text | YYYY-MM-DD derived from startTime |
| source | text | e.g. "Apple Health" |
| workout_type | text | e.g. "Running", "Cycling" |
| minutes | integer | derived from endTime − startTime |
| active_calories | integer | nullable |
| distance_km | numeric | nullable |

## Key Source Files

| File | Role |
|---|---|
| `supabase/functions/ingest-health/index.ts` | Edge function implementation |
| `src/lib/db.ts` — `upsertHealthMetric()` | Web-side metric upsert |
| `src/lib/db.ts` — `upsertImportedWorkout()` | Web-side workout upsert (idempotent) |
| `src/lib/db.ts` — `fetchHealth()` / `fetchImported()` | Read synced data in the web app |
| `ios/HealthBridge/APIClient.swift` | Swift HTTP client, passes Bearer token |
| `ios/HealthBridge/HealthKitManager.swift` | HealthKit data extraction |
| `supabase/migrations/add_sync_token.sql` | Migration that added sync_token to profiles |

## Testing

```powershell
# Serve the function locally (requires supabase CLI + local stack running)
supabase start
supabase functions serve ingest-health

# POST a test payload (replace TOKEN with a real sync_token from your profiles table)
$token = "YOUR-SYNC-TOKEN-HERE"
$body = @{
  metrics = @(
    @{ dateISO = "2025-01-01"; steps = 8000; sleepHours = 7.5; avgBPM = 62; caloriesBurned = 2100; activeMinutes = 45 }
  )
  workouts = @(
    @{ externalId = "test-uuid-001"; source = "Apple Health"; type = "Running";
       startTime = "2025-01-01T07:00:00.000Z"; endTime = "2025-01-01T07:45:00.000Z";
       calories = 420; distanceKm = 6.5 }
  )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:54321/functions/v1/ingest-health" `
  -Method POST `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $body
```

Expected response: `{ "upserted": 1, "workoutsUpserted": 1 }`

Re-run the same command → response is the same, but no duplicate rows are created.
