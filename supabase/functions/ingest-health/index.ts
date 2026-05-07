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

  let body: { metrics?: any[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const metrics: any[] = body.metrics ?? [];
  if (metrics.length === 0) {
    return new Response(JSON.stringify({ upserted: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows = metrics.map((m) => ({
    user_id: userId,
    date_iso: m.dateISO,
    steps: m.steps ?? 0,
    sleep_hours: m.sleepHours ?? 0,
    sleep_stages: m.sleepStages ?? null,  // [{ stage: string, minutes: number }]
    avg_bpm: m.avgBPM ?? 0,
    calories_burned: m.caloriesBurned ?? 0,
    active_minutes: m.activeMinutes ?? 0,
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

  return new Response(JSON.stringify({ upserted: rows.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
