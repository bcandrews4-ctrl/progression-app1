-- =============================================================================
-- Gym Progression App — Relational Migration
-- =============================================================================
-- Migrates from single profiles.data JSONB blob to individual tables.
-- Run in Supabase SQL Editor with the postgres role.
-- Idempotent: safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- profiles.data is kept as a backup — drop it later in Phase 5.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. New tables
-- ---------------------------------------------------------------------------

-- Lifts
CREATE TABLE IF NOT EXISTS public.lifts (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_iso text NOT NULL,
  lift_type text NOT NULL,
  weight_kg numeric NOT NULL,
  reps integer NOT NULL,
  rpe numeric,
  created_at timestamptz DEFAULT now()
);

-- Cardio entries
CREATE TABLE IF NOT EXISTS public.cardio_entries (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_iso text NOT NULL,
  machine text NOT NULL,
  seconds integer NOT NULL,
  calories integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Run entries
CREATE TABLE IF NOT EXISTS public.run_entries (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_iso text NOT NULL,
  distance_meters integer NOT NULL,
  input_type text NOT NULL,
  time_seconds integer,
  pace_sec_per_km numeric,
  rounds integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Imported workouts
CREATE TABLE IF NOT EXISTS public.imported_workouts (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_iso text NOT NULL,
  source text NOT NULL,
  workout_type text NOT NULL,
  minutes integer NOT NULL,
  active_calories integer,
  distance_km numeric,
  created_at timestamptz DEFAULT now()
);

-- Health metrics
CREATE TABLE IF NOT EXISTS public.health_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_iso text NOT NULL,
  steps integer DEFAULT 0,
  sleep_hours numeric DEFAULT 0,
  sleep_stages jsonb,
  avg_bpm integer DEFAULT 0,
  calories_burned integer DEFAULT 0,
  active_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date_iso)
);

-- ---------------------------------------------------------------------------
-- 2. Indexes on user_id
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_lifts_user_id ON public.lifts(user_id);
CREATE INDEX IF NOT EXISTS idx_cardio_entries_user_id ON public.cardio_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_run_entries_user_id ON public.run_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_imported_workouts_user_id ON public.imported_workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_id ON public.health_metrics(user_id);

-- ---------------------------------------------------------------------------
-- 3. Enable RLS + policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.lifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardio_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;

-- Lifts policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lifts' AND policyname='Users can view own lifts') THEN
    CREATE POLICY "Users can view own lifts" ON public.lifts FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lifts' AND policyname='Users can insert own lifts') THEN
    CREATE POLICY "Users can insert own lifts" ON public.lifts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lifts' AND policyname='Users can update own lifts') THEN
    CREATE POLICY "Users can update own lifts" ON public.lifts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lifts' AND policyname='Users can delete own lifts') THEN
    CREATE POLICY "Users can delete own lifts" ON public.lifts FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Cardio policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cardio_entries' AND policyname='Users can view own cardio') THEN
    CREATE POLICY "Users can view own cardio" ON public.cardio_entries FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cardio_entries' AND policyname='Users can insert own cardio') THEN
    CREATE POLICY "Users can insert own cardio" ON public.cardio_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cardio_entries' AND policyname='Users can update own cardio') THEN
    CREATE POLICY "Users can update own cardio" ON public.cardio_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cardio_entries' AND policyname='Users can delete own cardio') THEN
    CREATE POLICY "Users can delete own cardio" ON public.cardio_entries FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Run policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='run_entries' AND policyname='Users can view own runs') THEN
    CREATE POLICY "Users can view own runs" ON public.run_entries FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='run_entries' AND policyname='Users can insert own runs') THEN
    CREATE POLICY "Users can insert own runs" ON public.run_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='run_entries' AND policyname='Users can update own runs') THEN
    CREATE POLICY "Users can update own runs" ON public.run_entries FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='run_entries' AND policyname='Users can delete own runs') THEN
    CREATE POLICY "Users can delete own runs" ON public.run_entries FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Imported workouts policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='imported_workouts' AND policyname='Users can view own imported') THEN
    CREATE POLICY "Users can view own imported" ON public.imported_workouts FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='imported_workouts' AND policyname='Users can insert own imported') THEN
    CREATE POLICY "Users can insert own imported" ON public.imported_workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='imported_workouts' AND policyname='Users can update own imported') THEN
    CREATE POLICY "Users can update own imported" ON public.imported_workouts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='imported_workouts' AND policyname='Users can delete own imported') THEN
    CREATE POLICY "Users can delete own imported" ON public.imported_workouts FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Health metrics policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='health_metrics' AND policyname='Users can view own health') THEN
    CREATE POLICY "Users can view own health" ON public.health_metrics FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='health_metrics' AND policyname='Users can insert own health') THEN
    CREATE POLICY "Users can insert own health" ON public.health_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='health_metrics' AND policyname='Users can update own health') THEN
    CREATE POLICY "Users can update own health" ON public.health_metrics FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='health_metrics' AND policyname='Users can delete own health') THEN
    CREATE POLICY "Users can delete own health" ON public.health_metrics FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Add columns to profiles table
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS training_focus text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

-- Admin helper function used by RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Admins can view all profiles') THEN
    CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lifts' AND policyname='Admins can view all lifts') THEN
    CREATE POLICY "Admins can view all lifts" ON public.lifts FOR SELECT USING (public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cardio_entries' AND policyname='Admins can view all cardio') THEN
    CREATE POLICY "Admins can view all cardio" ON public.cardio_entries FOR SELECT USING (public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='run_entries' AND policyname='Admins can view all runs') THEN
    CREATE POLICY "Admins can view all runs" ON public.run_entries FOR SELECT USING (public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='imported_workouts' AND policyname='Admins can view all imported') THEN
    CREATE POLICY "Admins can view all imported" ON public.imported_workouts FOR SELECT USING (public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='health_metrics' AND policyname='Admins can view all health') THEN
    CREATE POLICY "Admins can view all health" ON public.health_metrics FOR SELECT USING (public.is_admin());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Migrate data from profiles.data JSON into new tables
-- ---------------------------------------------------------------------------

-- Lifts
INSERT INTO public.lifts (id, user_id, date_iso, lift_type, weight_kg, reps, rpe)
SELECT
  elem->>'id',
  p.id,
  elem->>'dateISO',
  elem->>'lift',
  (elem->>'weightKg')::numeric,
  ROUND((elem->>'reps')::numeric)::integer,
  (elem->>'rpe')::numeric
FROM public.profiles p, jsonb_array_elements(p.data->'lifts') AS elem
WHERE p.data->'lifts' IS NOT NULL
  AND jsonb_typeof(p.data->'lifts') = 'array'
  AND jsonb_array_length(p.data->'lifts') > 0
ON CONFLICT DO NOTHING;

-- Cardio entries
INSERT INTO public.cardio_entries (id, user_id, date_iso, machine, seconds, calories)
SELECT
  elem->>'id',
  p.id,
  elem->>'dateISO',
  elem->>'machine',
  ROUND((elem->>'seconds')::numeric)::integer,
  ROUND((elem->>'calories')::numeric)::integer
FROM public.profiles p, jsonb_array_elements(p.data->'cardio') AS elem
WHERE p.data->'cardio' IS NOT NULL
  AND jsonb_typeof(p.data->'cardio') = 'array'
  AND jsonb_array_length(p.data->'cardio') > 0
ON CONFLICT DO NOTHING;

-- Run entries
INSERT INTO public.run_entries (id, user_id, date_iso, distance_meters, input_type, time_seconds, pace_sec_per_km, rounds)
SELECT
  elem->>'id',
  p.id,
  elem->>'dateISO',
  ROUND((elem->>'distanceMeters')::numeric)::integer,
  elem->>'inputType',
  ROUND((elem->>'timeSeconds')::numeric)::integer,
  (elem->>'paceSecPerKm')::numeric,
  COALESCE(ROUND((elem->>'rounds')::numeric)::integer, 1)
FROM public.profiles p, jsonb_array_elements(p.data->'runs') AS elem
WHERE p.data->'runs' IS NOT NULL
  AND jsonb_typeof(p.data->'runs') = 'array'
  AND jsonb_array_length(p.data->'runs') > 0
ON CONFLICT DO NOTHING;

-- Imported workouts
INSERT INTO public.imported_workouts (id, user_id, date_iso, source, workout_type, minutes, active_calories, distance_km)
SELECT
  elem->>'id',
  p.id,
  elem->>'dateISO',
  elem->>'source',
  elem->>'workoutType',
  ROUND((elem->>'minutes')::numeric)::integer,
  ROUND((elem->>'activeCalories')::numeric)::integer,
  (elem->>'distanceKm')::numeric
FROM public.profiles p, jsonb_array_elements(p.data->'imported') AS elem
WHERE p.data->'imported' IS NOT NULL
  AND jsonb_typeof(p.data->'imported') = 'array'
  AND jsonb_array_length(p.data->'imported') > 0
ON CONFLICT DO NOTHING;

-- Health metrics (no id in source data, use UNIQUE(user_id, date_iso) conflict target)
INSERT INTO public.health_metrics (user_id, date_iso, steps, sleep_hours, sleep_stages, avg_bpm, calories_burned, active_minutes)
SELECT
  p.id,
  elem->>'dateISO',
  COALESCE(ROUND((elem->>'steps')::numeric)::integer, 0),
  COALESCE((elem->>'sleepHours')::numeric, 0),
  elem->'sleepStages',
  COALESCE(ROUND((elem->>'avgBPM')::numeric)::integer, 0),
  COALESCE(ROUND((elem->>'caloriesBurned')::numeric)::integer, 0),
  COALESCE(ROUND((elem->>'activeMinutes')::numeric)::integer, 0)
FROM public.profiles p, jsonb_array_elements(p.data->'health') AS elem
WHERE p.data->'health' IS NOT NULL
  AND jsonb_typeof(p.data->'health') = 'array'
  AND jsonb_array_length(p.data->'health') > 0
ON CONFLICT (user_id, date_iso) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Migrate profile-level fields into new columns
-- ---------------------------------------------------------------------------

UPDATE public.profiles SET
  training_focus = data->>'focus',
  onboarding_complete = COALESCE((data->>'onboarding_complete')::boolean, false)
WHERE data IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 7. Update handle_new_user trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, data, training_focus, onboarding_complete)
  VALUES (new.id, '{}'::jsonb, NULL, false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists from original schema, no need to recreate
