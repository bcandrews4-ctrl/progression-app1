import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { neon } from "https://esm.sh/@neondatabase/serverless@0.10";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return new Response("Unauthorized", { status: 401, headers: CORS });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) return new Response("Unauthorized", { status: 401, headers: CORS });

  const neonUrl = Deno.env.get("NEON_DATABASE_URL");
  if (!neonUrl) {
    return new Response(
      JSON.stringify({ error: "NEON_DATABASE_URL secret not set" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  const sql = neon(neonUrl);

  const rows: any[] = await sql(
    `SELECT * FROM health_daily
     WHERE synced_at > now() - interval '30 days'
     ORDER BY date ASC`,
  );

  let synced = 0;
  for (const row of rows) {
    if (!row.date) continue;

    const dateIso: string = typeof row.date === "string"
      ? row.date.slice(0, 10)
      : new Date(row.date).toISOString().slice(0, 10);

    const sleepStages = [
      { stage: "Deep",  minutes: Math.round((row.sleep_deep  ?? 0) * 60) },
      { stage: "REM",   minutes: Math.round((row.sleep_rem   ?? 0) * 60) },
      { stage: "Core",  minutes: Math.round((row.sleep_core  ?? 0) * 60) },
      { stage: "Awake", minutes: Math.round((row.sleep_awake ?? 0) * 60) },
    ].filter((s) => s.minutes > 0);

    const { error } = await supabase.from("health_metrics").upsert(
      {
        user_id: user.id,
        date_iso: dateIso,
        steps: row.steps ?? 0,
        sleep_hours: row.sleep_total ?? 0,
        sleep_stages: sleepStages.length > 0 ? sleepStages : null,
        avg_bpm: row.resting_hr ?? 0,
        calories_burned: (row.active_energy ?? 0) + (row.basal_energy ?? 0),
        active_minutes: row.exercise_min ?? null,
      },
      { onConflict: "user_id,date_iso" },
    );
    if (!error) synced++;
  }

  return new Response(JSON.stringify({ synced, total: rows.length }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
