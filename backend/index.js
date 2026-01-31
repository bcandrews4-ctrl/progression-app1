const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const { z } = require("zod");
const { nanoid } = require("nanoid");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT || 4000);
const dbPath = process.env.DB_PATH || path.join(__dirname, "data", "db.sqlite");
const corsOrigin = process.env.CORS_ORIGIN || "*";
const apiKey = process.env.API_KEY || "";

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    externalId TEXT,
    source TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    type TEXT NOT NULL,
    calories REAL,
    distanceKm REAL,
    avgHeartRate REAL,
    device TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS workouts_source_externalId
    ON workouts (source, externalId)
    WHERE externalId IS NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS workouts_source_start_end_type
    ON workouts (source, startTime, endTime, type);

  CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY,
    dateISO TEXT NOT NULL,
    source TEXT NOT NULL,
    steps INTEGER,
    sleepHours REAL,
    avgBPM REAL,
    caloriesBurned REAL,
    sleepStages TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS metrics_source_date
    ON metrics (source, dateISO);
`);

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  if (!apiKey) {
    return next();
  }
  const headerKey = req.header("x-api-key");
  const auth = req.header("authorization");
  const bearer = auth && auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (headerKey === apiKey || bearer === apiKey) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
});

const workoutSchema = z.object({
  externalId: z.string().optional(),
  source: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  type: z.string(),
  calories: z.number().optional(),
  distanceKm: z.number().optional(),
  avgHeartRate: z.number().optional(),
  device: z.string().optional(),
});

const sleepStageSchema = z.object({
  stage: z.string(),
  minutes: z.number(),
});

const metricSchema = z.object({
  dateISO: z.string(),
  source: z.string(),
  steps: z.number().optional(),
  sleepHours: z.number().optional(),
  avgBPM: z.number().optional(),
  caloriesBurned: z.number().optional(),
  sleepStages: z.array(sleepStageSchema).optional(),
});

const ingestSchema = z.object({
  workouts: z.array(workoutSchema).optional(),
  metrics: z.array(metricSchema).optional(),
});

app.get("/healthz", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/health/ingest", (req, res) => {
  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const now = new Date().toISOString();

  const insertWorkout = db.prepare(`
    INSERT OR IGNORE INTO workouts
      (id, externalId, source, startTime, endTime, type, calories, distanceKm, avgHeartRate, device, createdAt)
    VALUES
      (@id, @externalId, @source, @startTime, @endTime, @type, @calories, @distanceKm, @avgHeartRate, @device, @createdAt)
  `);

  const insertMetric = db.prepare(`
    INSERT OR IGNORE INTO metrics
      (id, dateISO, source, steps, sleepHours, avgBPM, caloriesBurned, sleepStages, createdAt)
    VALUES
      (@id, @dateISO, @source, @steps, @sleepHours, @avgBPM, @caloriesBurned, @sleepStages, @createdAt)
  `);

  let workoutsInserted = 0;
  let metricsInserted = 0;

  const insertTransaction = db.transaction(() => {
    if (payload.workouts) {
      payload.workouts.forEach((workout) => {
        const info = insertWorkout.run({
          id: nanoid(),
          externalId: workout.externalId || null,
          source: workout.source,
          startTime: workout.startTime,
          endTime: workout.endTime,
          type: workout.type,
          calories: workout.calories ?? null,
          distanceKm: workout.distanceKm ?? null,
          avgHeartRate: workout.avgHeartRate ?? null,
          device: workout.device ?? null,
          createdAt: now,
        });
        if (info.changes > 0) {
          workoutsInserted += 1;
        }
      });
    }

    if (payload.metrics) {
      payload.metrics.forEach((metric) => {
        const info = insertMetric.run({
          id: nanoid(),
          dateISO: metric.dateISO,
          source: metric.source,
          steps: metric.steps ?? null,
          sleepHours: metric.sleepHours ?? null,
          avgBPM: metric.avgBPM ?? null,
          caloriesBurned: metric.caloriesBurned ?? null,
          sleepStages: metric.sleepStages ? JSON.stringify(metric.sleepStages) : null,
          createdAt: now,
        });
        if (info.changes > 0) {
          metricsInserted += 1;
        }
      });
    }
  });

  insertTransaction();

  return res.json({
    ok: true,
    workoutsInserted,
    metricsInserted,
  });
});

app.get("/api/workouts", (req, res) => {
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;

  const rows = db.prepare(`
    SELECT *
    FROM workouts
    WHERE (@from IS NULL OR startTime >= @from)
      AND (@to IS NULL OR endTime <= @to)
    ORDER BY startTime DESC
  `).all({ from, to });

  res.json(rows);
});

app.get("/api/metrics", (req, res) => {
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;

  const rows = db.prepare(`
    SELECT *
    FROM metrics
    WHERE (@from IS NULL OR dateISO >= @from)
      AND (@to IS NULL OR dateISO <= @to)
    ORDER BY dateISO DESC
  `).all({ from, to });

  const parsed = rows.map((row) => ({
    ...row,
    sleepStages: row.sleepStages ? JSON.parse(row.sleepStages) : null,
  }));

  res.json(parsed);
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
