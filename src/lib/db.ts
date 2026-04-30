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

export type AdminMemberData = {
  lifts: LiftEntry[];
  cardio: CardioEntry[];
  runs: RunEntry[];
  imported: ImportedWorkout[];
};

export type AdminDashboardData = {
  members: AdminMemberSummary[];
  memberData: Record<string, AdminMemberData>;
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('training_focus, onboarding_complete, role, data, email')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  const nameFromData = (data.data as { name?: string } | null)?.name ?? null;
  const nameFromEmail = typeof data.email === "string" ? data.email.split("@")[0] : null;
  return {
    training_focus: data.training_focus as TrainingFocus | null,
    onboarding_complete: data.onboarding_complete as boolean,
    role: (data.role as string | null) ?? "member",
    display_name: nameFromData ?? nameFromEmail ?? "Member",
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

export async function deleteLift(userId: string, liftId: string) {
  const { error } = await supabase.from('lifts').delete().eq('id', liftId).eq('user_id', userId);
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

export async function deleteCardio(userId: string, cardioId: string) {
  const { error } = await supabase.from('cardio_entries').delete().eq('id', cardioId).eq('user_id', userId);
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

export async function deleteRun(userId: string, runId: string) {
  const { error } = await supabase.from('run_entries').delete().eq('id', runId).eq('user_id', userId);
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
  const cardioQuery = supabase
    .from('cardio_entries')
    .select('user_id, id, date_iso, machine, seconds, calories');
  const importedQuery = supabase
    .from('imported_workouts')
    .select('user_id, id, date_iso, source, workout_type, minutes, active_calories, distance_km');

  const [profilesRes, liftsRes, runsRes, cardioRes, importedRes] = await Promise.all([
    supabase.from('profiles').select('id, email, training_focus, role, data'),
    cutoffISO ? liftsQuery.gte('date_iso', cutoffISO) : liftsQuery,
    cutoffISO ? runsQuery.gte('date_iso', cutoffISO) : runsQuery,
    cutoffISO ? cardioQuery.gte('date_iso', cutoffISO) : cardioQuery,
    cutoffISO ? importedQuery.gte('date_iso', cutoffISO) : importedQuery,
  ]);

  if (profilesRes.error || liftsRes.error || runsRes.error || cardioRes.error) {
    console.error("[MasterDashboard:data] admin query failure", {
      userId,
      rangeDays,
      cutoffISO,
      profilesError: profilesRes.error?.message ?? null,
      liftsError: liftsRes.error?.message ?? null,
      runsError: runsRes.error?.message ?? null,
      cardioError: cardioRes.error?.message ?? null,
      importedError: importedRes.error?.message ?? null,
    });

    const firstError = profilesRes.error ?? liftsRes.error ?? runsRes.error ?? cardioRes.error;
    const msg = (firstError?.message ?? "").toLowerCase();
    if (msg.includes("forbidden") || msg.includes("permission denied") || msg.includes("row-level security")) {
      throw new Error("Admin data query blocked by RLS. Check admin role and SELECT policies for profiles/lifts/run_entries.");
    }
    throw firstError ?? new Error("Failed to load admin dashboard data.");
  }

  console.debug("[MasterDashboard:data] raw query counts", {
    rangeDays,
    profiles: (profilesRes.data ?? []).length,
    lifts: (liftsRes.data ?? []).length,
    runs: (runsRes.data ?? []).length,
    cardio: (cardioRes.data ?? []).length,
    imported: (importedRes.data ?? []).length,
  });

  const members: AdminMemberSummary[] = (profilesRes.data ?? [])
    .map((row) => {
      const rowId = row.id as string | null;
      if (!rowId) return null;
      return {
        userId: rowId,
        name: ((row.data as { name?: string } | null)?.name ?? (typeof row.email === "string" ? row.email.split("@")[0] : `Member ${rowId.slice(0, 6)}`)),
        email: (row.email as string | null) ?? null,
        role: ((row.role as string | null) ?? "member"),
        trainingFocus: (row.training_focus as TrainingFocus | null),
      };
    })
    .filter((m): m is AdminMemberSummary => Boolean(m?.userId));

  const memberMap = new Map(members.map((m) => [m.userId, m]));

  const lifts = (liftsRes.data ?? []).filter((r) => memberMap.has(r.user_id as string));
  const runs = (runsRes.data ?? []).filter((r) => memberMap.has(r.user_id as string));
  const cardio = (cardioRes.data ?? []).filter((r) => memberMap.has(r.user_id as string));
  const importedRows = (importedRes.data ?? []).filter((r) => memberMap.has(r.user_id as string));
  const memberData: Record<string, AdminMemberData> = {};
  for (const member of members) {
    memberData[member.userId] = {
      lifts: [],
      cardio: [],
      runs: [],
      imported: [],
    };
  }

  console.debug("[MasterDashboard:data] normalized series counts", {
    members: members.length,
    usersWithData: Object.keys(memberData).length,
  });

  for (const row of lifts) {
    const user = row.user_id as string;
    if (!memberData[user]) continue;
    const dateISO = toDateISO(String((row as { date_iso?: string }).date_iso ?? ""));
    const weightKg = parseNumeric((row as { weight_kg?: unknown }).weight_kg);
    const reps = parseNumeric((row as { reps?: unknown }).reps);
    if (!dateISO || weightKg == null || reps == null) continue;
    const rpeRaw = parseNumeric((row as { rpe?: unknown }).rpe);
    memberData[user].lifts.push({
      id: `admin-lift-${user}-${dateISO}-${Math.random().toString(36).slice(2, 8)}`,
      dateISO,
      lift: String((row as { lift_type?: string }).lift_type ?? ""),
      weightKg,
      reps: Math.max(1, Math.round(reps)),
      ...(rpeRaw != null ? { rpe: rpeRaw } : {}),
    });
  }

  for (const row of cardio) {
    const user = row.user_id as string;
    if (!memberData[user]) continue;
    const dateISO = toDateISO(String((row as { date_iso?: string }).date_iso ?? ""));
    const seconds = parseNumeric((row as { seconds?: unknown }).seconds);
    const calories = parseNumeric((row as { calories?: unknown }).calories);
    if (!dateISO || seconds == null || calories == null) continue;
    memberData[user].cardio.push({
      id: String((row as { id?: string }).id ?? `admin-cardio-${user}-${dateISO}`),
      dateISO,
      machine: String((row as { machine?: string }).machine ?? ""),
      seconds: Math.max(1, Math.round(seconds)),
      calories: Math.max(0, Math.round(calories)),
    });
  }

  for (const row of runs) {
    const user = row.user_id as string;
    if (!memberData[user]) continue;
    const dateISO = toDateISO(String((row as { date_iso?: string }).date_iso ?? ""));
    const distanceMeters = parseNumeric((row as { distance_meters?: unknown }).distance_meters);
    if (!dateISO || distanceMeters == null) continue;
    const inputType = String((row as { input_type?: string }).input_type ?? "").toUpperCase() === "PACE" ? "PACE" : "TIME";
    const timeSecondsRaw = parseNumeric((row as { time_seconds?: unknown }).time_seconds);
    const paceRaw = parseNumeric((row as { pace_sec_per_km?: unknown }).pace_sec_per_km);
    const roundsRaw = parseNumeric((row as { rounds?: unknown }).rounds);
    memberData[user].runs.push({
      id: `admin-run-${user}-${dateISO}-${Math.random().toString(36).slice(2, 8)}`,
      dateISO,
      distanceMeters: Math.max(1, Math.round(distanceMeters)),
      inputType,
      ...(timeSecondsRaw != null ? { timeSeconds: Math.max(1, Math.round(timeSecondsRaw)) } : {}),
      ...(paceRaw != null ? { paceSecPerKm: paceRaw } : {}),
      rounds: Math.max(1, Math.round(roundsRaw ?? 1)),
    });
  }

  for (const row of importedRows) {
    const user = row.user_id as string;
    if (!memberData[user]) continue;
    const dateISO = toDateISO(String((row as { date_iso?: string }).date_iso ?? ""));
    if (!dateISO) continue;
    const minutesRaw = parseNumeric((row as { minutes?: unknown }).minutes);
    const calsRaw = parseNumeric((row as { active_calories?: unknown }).active_calories);
    const distKmRaw = parseNumeric((row as { distance_km?: unknown }).distance_km);
    memberData[user].imported.push({
      id: String((row as { id?: string }).id ?? `admin-imp-${user}-${dateISO}`),
      dateISO,
      source: String((row as { source?: string }).source ?? ""),
      workoutType: String((row as { workout_type?: string }).workout_type ?? ""),
      minutes: Math.max(0, Math.round(minutesRaw ?? 0)),
      ...(calsRaw != null ? { activeCalories: Math.round(calsRaw) } : {}),
      ...(distKmRaw != null ? { distanceKm: distKmRaw } : {}),
    });
  }

  return {
    members,
    memberData,
  };
}

// ---------------------------------------------------------------------------
// Community posts
// ---------------------------------------------------------------------------

export type CommunityPost = {
  id: string;
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export async function fetchCommunityPosts(): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from('community_posts')
    .select('id, user_id, author_name, body, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) { console.error('fetchCommunityPosts error:', error); return []; }
  return (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    authorName: r.author_name,
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function insertCommunityPost(userId: string, authorName: string, body: string): Promise<void> {
  const { error } = await supabase.from('community_posts').insert({
    user_id: userId,
    author_name: authorName,
    body: body.trim(),
  });
  if (error) throw error;
}
