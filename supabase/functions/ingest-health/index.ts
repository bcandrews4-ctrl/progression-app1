import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Auth: Bearer <sync_token>
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Look up user by sync_token
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("sync_token", token)
    .single();

  if (profileErr || !profile) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = profile.id as string;

  let body: { metrics?: any[]; workouts?: any[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const metrics: any[] = body.metrics ?? [];
  const workouts: any[] = body.workouts ?? [];

  let upserted = 0;
  let workoutsUpserted = 0;

  if (metrics.length > 0) {
    const rows = metrics.map((m) => ({
      user_id: userId,
      date_iso: m.dateISO,
      steps: m.steps ?? 0,
      sleep_hours: m.sleepHours ?? 0,
      sleep_stages: m.sleepStages ?? null,
      avg_bpm: m.avgBPM ?? 0,
      calories_burned: m.caloriesBurned ?? 0,
      active_minutes: m.activeMinutes ?? 0,
      hrv_ms: m.hrvMs ?? null,
      resting_bpm: m.restingBPM ?? null,
      vo2_max: m.vo2Max ?? null,
      stand_hours: m.standHours ?? null,
      respiratory_rate: m.respiratoryRate ?? null,
      mindfulness_minutes: m.mindfulMinutes ?? null,
    }));

    const { error } = await supabase
      .from("health_metrics")
      .upsert(rows, { onConflict: "user_id,date_iso" });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    upserted = rows.length;
  }

  if (workouts.length > 0) {
    const workoutRows = workouts.map((w) => ({
      id: w.externalId,
      user_id: userId,
      date_iso: (w.startTime as string).slice(0, 10),
      source: w.source ?? "Apple Health",
      workout_type: w.type,
      minutes: Math.max(0, Math.round((new Date(w.endTime).getTime() - new Date(w.startTime).getTime()) / 60000)),
      active_calories: w.calories != null ? Math.round(w.calories) : null,
      distance_km: w.distanceKm ?? null,
    }));

    const { error: wErr } = await supabase
      .from("imported_workouts")
      .upsert(workoutRows, { onConflict: "id" });

    if (wErr) {
      return new Response(JSON.stringify({ error: wErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    workoutsUpserted = workoutRows.length;
  }

  return new Response(JSON.stringify({ upserted, workoutsUpserted }), {
    headers: { "Content-Type": "application/json" },
  });
});
