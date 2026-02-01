-- Strava Integration Tables
-- Run this in Supabase SQL Editor

-- Table: strava_connections
CREATE TABLE IF NOT EXISTS public.strava_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id bigint NOT NULL,
  athlete_name text,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at bigint NOT NULL, -- epoch seconds
  scope text NOT NULL,
  last_sync_at timestamptz,
  connected_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: strava_activities
CREATE TABLE IF NOT EXISTS public.strava_activities (
  id bigint PRIMARY KEY, -- Strava activity id
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  name text,
  start_date timestamptz NOT NULL,
  timezone text,
  moving_time int, -- seconds
  elapsed_time int, -- seconds
  distance_m numeric, -- meters
  calories numeric,
  average_heartrate numeric,
  max_heartrate numeric,
  average_speed numeric, -- m/s
  max_speed numeric, -- m/s
  total_elevation_gain numeric, -- meters
  source text DEFAULT 'strava',
  raw jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_strava_activities_user_id ON public.strava_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_strava_activities_start_date ON public.strava_activities(start_date);
CREATE INDEX IF NOT EXISTS idx_strava_activities_type ON public.strava_activities(type);

-- Enable RLS
ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strava_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strava_connections
CREATE POLICY "Users can view own Strava connection"
ON public.strava_connections
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Strava connection"
ON public.strava_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Strava connection"
ON public.strava_connections
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own Strava connection"
ON public.strava_connections
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for strava_activities
CREATE POLICY "Users can view own Strava activities"
ON public.strava_activities
FOR SELECT
USING (auth.uid() = user_id);

-- Allow service role to insert/update (for server-side sync)
-- Client-side inserts must enforce user_id = auth.uid()
CREATE POLICY "Users can insert own Strava activities"
ON public.strava_activities
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Strava activities"
ON public.strava_activities
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_strava_connections_updated_at
  BEFORE UPDATE ON public.strava_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strava_activities_updated_at
  BEFORE UPDATE ON public.strava_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
