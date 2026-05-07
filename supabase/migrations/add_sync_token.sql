-- Add sync_token to profiles for Apple Health / HealthBridge authentication
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sync_token uuid DEFAULT gen_random_uuid();

-- Backfill any existing rows that have no token
UPDATE public.profiles
SET sync_token = gen_random_uuid()
WHERE sync_token IS NULL;
