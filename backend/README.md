## Gym Progression Backend

This backend ingests HealthKit workouts and daily health metrics, stores them in SQLite,
and serves them to the desktop app.

### Setup
1. Install dependencies:
   - `npm install`
2. Create a `.env` file (optional):
   - `PORT=4000`
   - `DB_PATH=./data/db.sqlite`
   - `API_KEY=change-me`
   - `CORS_ORIGIN=*`
3. Start the server:
   - `npm run dev`

### API
`POST /api/health/ingest`
```json
{
  "workouts": [
    {
      "externalId": "healthkit-workout-id",
      "source": "Apple Health",
      "startTime": "2026-01-22T10:00:00Z",
      "endTime": "2026-01-22T10:42:00Z",
      "type": "Running",
      "calories": 420,
      "distanceKm": 6.2,
      "avgHeartRate": 148,
      "device": "Apple Watch"
    }
  ],
  "metrics": [
    {
      "dateISO": "2026-01-22",
      "source": "Apple Health",
      "steps": 8421,
      "sleepHours": 7.3,
      "avgBPM": 61,
      "caloriesBurned": 2480,
      "sleepStages": [
        { "stage": "Deep", "minutes": 75 },
        { "stage": "Core", "minutes": 210 },
        { "stage": "REM", "minutes": 85 },
        { "stage": "Awake", "minutes": 20 }
      ]
    }
  ]
}
```

`GET /api/workouts?from=2026-01-01T00:00:00Z&to=2026-01-31T23:59:59Z`

`GET /api/metrics?from=2026-01-01&to=2026-01-31`

### Auth
If `API_KEY` is set, send it as:
`Authorization: Bearer <API_KEY>` or `x-api-key: <API_KEY>`.
