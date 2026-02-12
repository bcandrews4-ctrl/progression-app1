import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Types (match App.tsx)
// ---------------------------------------------------------------------------

export type TrainingFocus = "STRENGTH" | "HYPERTROPHY" | "HYBRID";

export type LiftEntry = {
  id: string;
  dateISO: string;
  lift: string;
  weightKg: number;
  reps: number;
  rpe?: number;
};

export type CardioEntry = {
  id: string;
  dateISO: string;
  machine: string;
  seconds: number;
  calories: number;
};

export type RunEntry = {
  id: string;
  dateISO: string;
  distanceMeters: number;
  inputType: "TIME" | "PACE";
  timeSeconds?: number;
  paceSecPerKm?: number;
  rounds: number;
};

export type ImportedWorkout = {
  id: string;
  dateISO: string;
  source: string;
  workoutType: string;
  minutes: number;
  activeCalories?: number;
  distanceKm?: number;
};

export type HealthMetric = {
  dateISO: string;
  steps: number;
  sleepHours: number;
  sleepStages?: { time: string; stage: string }[];
  avgBPM: number;
  caloriesBurned: number;
  activeMinutes: number;
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('training_focus, onboarding_complete')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return {
    training_focus: data.training_focus as TrainingFocus | null,
    onboarding_complete: data.onboarding_complete as boolean,
  };
}

export async function updateProfile(
  userId: string,
  updates: { training_focus?: TrainingFocus | null; onboarding_complete?: boolean },
) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Lifts
// ---------------------------------------------------------------------------

export async function fetchLifts(userId: string): Promise<LiftEntry[]> {
  const { data, error } = await supabase
    .from('lifts')
    .select('id, date_iso, lift_type, weight_kg, reps, rpe')
    .eq('user_id', userId)
    .order('date_iso', { ascending: false });

  if (error) { console.error('fetchLifts error:', error); return []; }
  return (data ?? []).map(r => ({
    id: r.id,
    dateISO: r.date_iso,
    lift: r.lift_type,
    weightKg: Number(r.weight_kg),
    reps: r.reps,
    ...(r.rpe != null ? { rpe: Number(r.rpe) } : {}),
  }));
}

export async function insertLift(userId: string, entry: LiftEntry) {
  const { error } = await supabase.from('lifts').insert({
    id: entry.id,
    user_id: userId,
    date_iso: entry.dateISO,
    lift_type: entry.lift,
    weight_kg: entry.weightKg,
    reps: entry.reps,
    rpe: entry.rpe ?? null,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Cardio
// ---------------------------------------------------------------------------

export async function fetchCardio(userId: string): Promise<CardioEntry[]> {
  const { data, error } = await supabase
    .from('cardio_entries')
    .select('id, date_iso, machine, seconds, calories')
    .eq('user_id', userId)
    .order('date_iso', { ascending: false });

  if (error) { console.error('fetchCardio error:', error); return []; }
  return (data ?? []).map(r => ({
    id: r.id,
    dateISO: r.date_iso,
    machine: r.machine,
    seconds: r.seconds,
    calories: r.calories,
  }));
}

export async function insertCardio(userId: string, entry: CardioEntry) {
  const { error } = await supabase.from('cardio_entries').insert({
    id: entry.id,
    user_id: userId,
    date_iso: entry.dateISO,
    machine: entry.machine,
    seconds: entry.seconds,
    calories: entry.calories,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

export async function fetchRuns(userId: string): Promise<RunEntry[]> {
  const { data, error } = await supabase
    .from('run_entries')
    .select('id, date_iso, distance_meters, input_type, time_seconds, pace_sec_per_km, rounds')
    .eq('user_id', userId)
    .order('date_iso', { ascending: false });

  if (error) { console.error('fetchRuns error:', error); return []; }
  return (data ?? []).map(r => ({
    id: r.id,
    dateISO: r.date_iso,
    distanceMeters: r.distance_meters,
    inputType: r.input_type as "TIME" | "PACE",
    ...(r.time_seconds != null ? { timeSeconds: r.time_seconds } : {}),
    ...(r.pace_sec_per_km != null ? { paceSecPerKm: Number(r.pace_sec_per_km) } : {}),
    rounds: r.rounds,
  }));
}

export async function insertRun(userId: string, entry: RunEntry) {
  const { error } = await supabase.from('run_entries').insert({
    id: entry.id,
    user_id: userId,
    date_iso: entry.dateISO,
    distance_meters: entry.distanceMeters,
    input_type: entry.inputType,
    time_seconds: entry.timeSeconds ?? null,
    pace_sec_per_km: entry.paceSecPerKm ?? null,
    rounds: entry.rounds,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Imported workouts
// ---------------------------------------------------------------------------

export async function fetchImported(userId: string): Promise<ImportedWorkout[]> {
  const { data, error } = await supabase
    .from('imported_workouts')
    .select('id, date_iso, source, workout_type, minutes, active_calories, distance_km')
    .eq('user_id', userId)
    .order('date_iso', { ascending: false });

  if (error) { console.error('fetchImported error:', error); return []; }
  return (data ?? []).map(r => ({
    id: r.id,
    dateISO: r.date_iso,
    source: r.source,
    workoutType: r.workout_type,
    minutes: r.minutes,
    ...(r.active_calories != null ? { activeCalories: r.active_calories } : {}),
    ...(r.distance_km != null ? { distanceKm: Number(r.distance_km) } : {}),
  }));
}

export async function insertImported(userId: string, entry: ImportedWorkout) {
  const { error } = await supabase.from('imported_workouts').insert({
    id: entry.id,
    user_id: userId,
    date_iso: entry.dateISO,
    source: entry.source,
    workout_type: entry.workoutType,
    minutes: entry.minutes,
    active_calories: entry.activeCalories ?? null,
    distance_km: entry.distanceKm ?? null,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Health metrics
// ---------------------------------------------------------------------------

export async function fetchHealth(userId: string): Promise<HealthMetric[]> {
  const { data, error } = await supabase
    .from('health_metrics')
    .select('date_iso, steps, sleep_hours, sleep_stages, avg_bpm, calories_burned, active_minutes')
    .eq('user_id', userId)
    .order('date_iso', { ascending: false });

  if (error) { console.error('fetchHealth error:', error); return []; }
  return (data ?? []).map(r => ({
    dateISO: r.date_iso,
    steps: r.steps ?? 0,
    sleepHours: Number(r.sleep_hours ?? 0),
    sleepStages: r.sleep_stages as HealthMetric['sleepStages'],
    avgBPM: r.avg_bpm ?? 0,
    caloriesBurned: r.calories_burned ?? 0,
    activeMinutes: r.active_minutes ?? 0,
  }));
}

export async function upsertHealthMetric(userId: string, metric: HealthMetric) {
  const { error } = await supabase.from('health_metrics').upsert(
    {
      user_id: userId,
      date_iso: metric.dateISO,
      steps: metric.steps,
      sleep_hours: metric.sleepHours,
      sleep_stages: metric.sleepStages ?? null,
      avg_bpm: metric.avgBPM,
      calories_burned: metric.caloriesBurned,
      active_minutes: metric.activeMinutes,
    },
    { onConflict: 'user_id,date_iso' },
  );
  if (error) throw error;
}
