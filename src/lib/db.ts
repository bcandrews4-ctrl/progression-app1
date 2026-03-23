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

export type AdminMemberSummary = {
  userId: string;
  name: string;
  email: string | null;
  role: string;
  trainingFocus: TrainingFocus | null;
};

export type AdminChartPoint = {
  dateISO: string;
  value: number;
};

export type AdminMemberSeries = {
  benchE1rmSeries: AdminChartPoint[];
  squatE1rmSeries: AdminChartPoint[];
  runPace1kmSeries: AdminChartPoint[];
};

export type AdminDashboardData = {
  members: AdminMemberSummary[];
  memberSeries: Record<string, AdminMemberSeries>;
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('training_focus, onboarding_complete, role')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return {
    training_focus: data.training_focus as TrainingFocus | null,
    onboarding_complete: data.onboarding_complete as boolean,
    role: (data.role as string | null) ?? "member",
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

function toDateISO(input: string) {
  return input.slice(0, 10);
}

function normalizeLiftType(value: unknown) {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "bench press" || v === "bench_press") return "bench";
  if (v === "back squat" || v === "back_squat") return "squat";
  return "other";
}

function parseNumeric(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function e1rm(weightKg: number, reps: number) {
  return weightKg * (1 + reps / 30);
}

function normalizePaceSecPerKm(run: {
  input_type: string;
  distance_meters: number | null;
  time_seconds: number | null;
  pace_sec_per_km: number | null;
  rounds: number | null;
}): number | null {
  const inputType = String(run.input_type ?? "").trim().toUpperCase();
  const pace = parseNumeric(run.pace_sec_per_km);
  const distanceMeters = parseNumeric(run.distance_meters);
  const timeSeconds = parseNumeric(run.time_seconds);
  const rounds = Math.max(1, parseNumeric(run.rounds) ?? 1);

  if (inputType === "PACE" && pace != null) {
    return pace;
  }
  if (inputType === "TIME" && timeSeconds != null && distanceMeters != null) {
    const totalDistanceKm = (distanceMeters * rounds) / 1000;
    if (totalDistanceKm <= 0) return null;
    return timeSeconds / totalDistanceKm;
  }
  return null;
}

export async function fetchAdminDashboardData(userId: string, rangeDays: 30 | 90 | 365 | "All-time"): Promise<AdminDashboardData> {
  const profile = await fetchProfile(userId);
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }

  const cutoffISO =
    rangeDays === "All-time"
      ? null
      : (() => {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - rangeDays + 1);
          return cutoff.toISOString().slice(0, 10);
        })();

  const liftsQuery = supabase
    .from('lifts')
    .select('user_id, date_iso, lift_type, weight_kg, reps');
  const runsQuery = supabase
    .from('run_entries')
    .select('user_id, date_iso, distance_meters, input_type, time_seconds, pace_sec_per_km, rounds');

  const [profilesRes, liftsRes, runsRes] = await Promise.all([
    supabase.from('profiles').select('id, email, training_focus, role, data'),
    cutoffISO ? liftsQuery.gte('date_iso', cutoffISO) : liftsQuery,
    cutoffISO ? runsQuery.gte('date_iso', cutoffISO) : runsQuery,
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (liftsRes.error) throw liftsRes.error;
  if (runsRes.error) throw runsRes.error;

  console.debug("[MasterDashboard:data] raw query counts", {
    rangeDays,
    profiles: (profilesRes.data ?? []).length,
    lifts: (liftsRes.data ?? []).length,
    runs: (runsRes.data ?? []).length,
  });

  const members: AdminMemberSummary[] = (profilesRes.data ?? []).map((row) => ({
    userId: row.id as string,
    name: ((row.data as { name?: string } | null)?.name ?? (typeof row.email === "string" ? row.email.split("@")[0] : `Member ${(row.id as string).slice(0, 6)}`)),
    email: (row.email as string | null) ?? null,
    role: ((row.role as string | null) ?? "member"),
    trainingFocus: (row.training_focus as TrainingFocus | null),
  }));

  const memberMap = new Map(members.map((m) => [m.userId, m]));

  const lifts = (liftsRes.data ?? []).filter((r) => memberMap.has(r.user_id as string));
  const runs = (runsRes.data ?? []).filter((r) => memberMap.has(r.user_id as string));

  const benchByUser = new Map<string, AdminChartPoint[]>();
  const squatByUser = new Map<string, AdminChartPoint[]>();
  for (const row of lifts) {
    const user = row.user_id as string;
    const dateISO = toDateISO(String((row as { date_iso?: string }).date_iso ?? ""));
    const weightKg = parseNumeric((row as { weight_kg?: unknown }).weight_kg);
    const reps = parseNumeric((row as { reps?: unknown }).reps);
    if (!dateISO || weightKg == null || reps == null) continue;
    const liftPoint = { dateISO, e1rm: e1rm(weightKg, reps) };

    const liftType = normalizeLiftType((row as { lift_type?: string }).lift_type);
    if (liftType === "bench") {
      const bench = benchByUser.get(user) ?? [];
      bench.push({ dateISO: liftPoint.dateISO, value: liftPoint.e1rm });
      benchByUser.set(user, bench);
    }
    if (liftType === "squat") {
      const squat = squatByUser.get(user) ?? [];
      squat.push({ dateISO: liftPoint.dateISO, value: liftPoint.e1rm });
      squatByUser.set(user, squat);
    }
  }

  const runPaceByUser = new Map<string, AdminChartPoint[]>();
  for (const row of runs) {
    const user = row.user_id as string;
    const paceSecPerKm = normalizePaceSecPerKm({
      input_type: String((row as { input_type?: string }).input_type ?? ""),
      distance_meters: Number((row as { distance_meters?: number }).distance_meters ?? 0),
      time_seconds: (row as { time_seconds?: number | null }).time_seconds ?? null,
      pace_sec_per_km: (row as { pace_sec_per_km?: number | null }).pace_sec_per_km ?? null,
      rounds: (row as { rounds?: number | null }).rounds ?? 1,
    });
    if (paceSecPerKm == null || !Number.isFinite(paceSecPerKm)) continue;
    const dateISO = toDateISO(String((row as { date_iso?: string }).date_iso ?? ""));
    if (!dateISO) continue;
    const paceSeries = runPaceByUser.get(user) ?? [];
    paceSeries.push({ dateISO, value: paceSecPerKm });
    runPaceByUser.set(user, paceSeries);
  }

  const memberSeries: Record<string, AdminMemberSeries> = {};
  for (const member of members) {
    memberSeries[member.userId] = {
      benchE1rmSeries: [...(benchByUser.get(member.userId) ?? [])].sort((a, b) => a.dateISO.localeCompare(b.dateISO)),
      squatE1rmSeries: [...(squatByUser.get(member.userId) ?? [])].sort((a, b) => a.dateISO.localeCompare(b.dateISO)),
      runPace1kmSeries: [...(runPaceByUser.get(member.userId) ?? [])].sort((a, b) => a.dateISO.localeCompare(b.dateISO)),
    };
  }

  console.debug("[MasterDashboard:data] normalized series counts", {
    members: members.length,
    benchUsers: benchByUser.size,
    squatUsers: squatByUser.size,
    runningUsers: runPaceByUser.size,
  });

  return {
    members,
    memberSeries,
  };
}
