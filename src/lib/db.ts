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
  role: string;
  trainingFocus: TrainingFocus | null;
};

export type AdminWeeklyPoint = {
  weekStartISO: string;
  workouts: number;
  avgActiveDaysPerMember: number;
};

export type AdminMemberProgressPoint = {
  userId: string;
  name: string;
  workouts: number;
  strengthDeltaKg: number;
  avgWeeklySessions: number;
};

export type AdminMemberBreakoutPoint = {
  weekStartISO: string;
  workouts: number;
};

export type AdminDashboardData = {
  members: AdminMemberSummary[];
  kpis: {
    totalActiveMembers: number;
    workoutsLogged: number;
    avgWeeklySessions: number;
    avgTrendDeltaKg: number;
  };
  weeklyTrend: AdminWeeklyPoint[];
  progressionDistribution: AdminMemberProgressPoint[];
  adherenceTrend: Array<{ weekStartISO: string; value: number }>;
  memberBreakout: Record<string, AdminMemberBreakoutPoint[]>;
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

function toWeekStartISO(dateISO: string) {
  const date = new Date(`${toDateISO(dateISO)}T00:00:00`);
  const day = date.getDay();
  const mondayDelta = (day + 6) % 7;
  date.setDate(date.getDate() - mondayDelta);
  return date.toISOString().slice(0, 10);
}

function e1rm(weightKg: number, reps: number) {
  return weightKg * (1 + reps / 30);
}

export async function fetchAdminDashboardData(userId: string, rangeDays: 30 | 90 | 365): Promise<AdminDashboardData> {
  const profile = await fetchProfile(userId);
  if (!profile || profile.role !== "admin") {
    throw new Error("Forbidden: admin access required");
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - rangeDays + 1);
  const cutoffISO = cutoff.toISOString().slice(0, 10);

  const [profilesRes, liftsRes, cardioRes, runsRes, importedRes] = await Promise.all([
    supabase.from('profiles').select('id, training_focus, role, data').eq('onboarding_complete', true),
    supabase.from('lifts').select('user_id, date_iso, weight_kg, reps').gte('date_iso', cutoffISO),
    supabase.from('cardio_entries').select('user_id, date_iso').gte('date_iso', cutoffISO),
    supabase.from('run_entries').select('user_id, date_iso').gte('date_iso', cutoffISO),
    supabase.from('imported_workouts').select('user_id, date_iso').gte('date_iso', cutoffISO),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (liftsRes.error) throw liftsRes.error;
  if (cardioRes.error) throw cardioRes.error;
  if (runsRes.error) throw runsRes.error;
  if (importedRes.error) throw importedRes.error;

  const members: AdminMemberSummary[] = (profilesRes.data ?? []).map((row) => ({
    userId: row.id as string,
    name: ((row.data as { name?: string } | null)?.name ?? `Member ${(row.id as string).slice(0, 6)}`),
    role: ((row.role as string | null) ?? "member"),
    trainingFocus: (row.training_focus as TrainingFocus | null),
  }));

  const memberMap = new Map(members.map((m) => [m.userId, m]));

  const lifts = (liftsRes.data ?? []).filter((r) => memberMap.has(r.user_id as string));
  const cardio = (cardioRes.data ?? []).filter((r) => memberMap.has(r.user_id as string));
  const runs = (runsRes.data ?? []).filter((r) => memberMap.has(r.user_id as string));
  const imported = (importedRes.data ?? []).filter((r) => memberMap.has(r.user_id as string));

  const workoutRows = [
    ...lifts.map((r) => ({ userId: r.user_id as string, dateISO: toDateISO(r.date_iso as string) })),
    ...cardio.map((r) => ({ userId: r.user_id as string, dateISO: toDateISO(r.date_iso as string) })),
    ...runs.map((r) => ({ userId: r.user_id as string, dateISO: toDateISO(r.date_iso as string) })),
    ...imported.map((r) => ({ userId: r.user_id as string, dateISO: toDateISO(r.date_iso as string) })),
  ];

  const weekly = new Map<string, { workouts: number; memberDays: Map<string, Set<string>> }>();
  for (const row of workoutRows) {
    const weekStartISO = toWeekStartISO(row.dateISO);
    const existing = weekly.get(weekStartISO) ?? { workouts: 0, memberDays: new Map<string, Set<string>>() };
    existing.workouts += 1;
    const set = existing.memberDays.get(row.userId) ?? new Set<string>();
    set.add(row.dateISO);
    existing.memberDays.set(row.userId, set);
    weekly.set(weekStartISO, existing);
  }

  const weeklyTrend = Array.from(weekly.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekStartISO, row]) => {
      const activeDays = Array.from(row.memberDays.values()).map((d) => d.size);
      const avgActiveDaysPerMember = members.length > 0
        ? activeDays.reduce((acc, n) => acc + n, 0) / members.length
        : 0;
      return {
        weekStartISO,
        workouts: row.workouts,
        avgActiveDaysPerMember,
      };
    });

  const liftsByUser = new Map<string, Array<{ dateISO: string; e1rm: number }>>();
  for (const row of lifts) {
    const user = row.user_id as string;
    const list = liftsByUser.get(user) ?? [];
    list.push({
      dateISO: toDateISO(row.date_iso as string),
      e1rm: e1rm(Number(row.weight_kg ?? 0), Number(row.reps ?? 0)),
    });
    liftsByUser.set(user, list);
  }

  const workoutCountByUser = new Map<string, number>();
  for (const row of workoutRows) {
    workoutCountByUser.set(row.userId, (workoutCountByUser.get(row.userId) ?? 0) + 1);
  }

  const progressionDistribution: AdminMemberProgressPoint[] = members.map((member) => {
    const rows = (liftsByUser.get(member.userId) ?? []).sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    const strengthDeltaKg = rows.length >= 2 ? rows[rows.length - 1].e1rm - rows[0].e1rm : 0;
    const workouts = workoutCountByUser.get(member.userId) ?? 0;
    return {
      userId: member.userId,
      name: member.name,
      workouts,
      strengthDeltaKg,
      avgWeeklySessions: workouts / Math.max(1, rangeDays / 7),
    };
  }).sort((a, b) => b.strengthDeltaKg - a.strengthDeltaKg);

  const memberBreakout: Record<string, AdminMemberBreakoutPoint[]> = {};
  for (const member of members) {
    const byWeek = new Map<string, number>();
    for (const row of workoutRows) {
      if (row.userId !== member.userId) continue;
      const weekStartISO = toWeekStartISO(row.dateISO);
      byWeek.set(weekStartISO, (byWeek.get(weekStartISO) ?? 0) + 1);
    }
    memberBreakout[member.userId] = Array.from(byWeek.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([weekStartISO, workouts]) => ({ weekStartISO, workouts }));
  }

  const workoutsLogged = workoutRows.length;
  const totalActiveMembers = members.filter((m) => (workoutCountByUser.get(m.userId) ?? 0) > 0).length;
  const avgWeeklySessions = members.length > 0
    ? progressionDistribution.reduce((acc, m) => acc + m.avgWeeklySessions, 0) / members.length
    : 0;
  const avgTrendDeltaKg = members.length > 0
    ? progressionDistribution.reduce((acc, m) => acc + m.strengthDeltaKg, 0) / members.length
    : 0;

  return {
    members,
    kpis: {
      totalActiveMembers,
      workoutsLogged,
      avgWeeklySessions,
      avgTrendDeltaKg,
    },
    weeklyTrend,
    progressionDistribution,
    adherenceTrend: weeklyTrend.map((w) => ({ weekStartISO: w.weekStartISO, value: w.avgActiveDaysPerMember })),
    memberBreakout,
  };
}
