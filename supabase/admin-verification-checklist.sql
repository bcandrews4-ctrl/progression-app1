-- Master admin data access verification checklist
-- Run these read-only checks in Supabase SQL Editor.
-- This script validates that migration-relational.sql policies are active.

-- 1) Verify required profile columns exist.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('role', 'training_focus', 'onboarding_complete')
order by column_name;

-- 2) Verify admin helper function exists.
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'is_admin';

-- 3) Verify admin SELECT policies exist across chart-backed tables.
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'lifts', 'cardio_entries', 'run_entries', 'imported_workouts', 'health_metrics')
  and policyname ilike 'Admins can view all%'
order by tablename, policyname;

-- 4) Verify your current account role value (replace with your admin user UUID).
-- select id, email, role from public.profiles where id = 'YOUR_ADMIN_USER_ID';

-- 5) Optional quick counts to confirm data exists for dashboard queries.
select
  (select count(*) from public.profiles) as profiles_count,
  (select count(*) from public.lifts) as lifts_count,
  (select count(*) from public.run_entries) as runs_count;
