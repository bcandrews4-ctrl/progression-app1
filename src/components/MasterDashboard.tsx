import React, { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { GlassCard } from "./GlassCard";
import { SegmentedControl } from "./SegmentedControl";
import { colors } from "../styles/tokens";
import { fetchAdminDashboardData, type AdminDashboardData } from "../lib/db";

type ProgressFilter = "Lifts" | "Cardio" | "Running";
type LiftMetric = "e1RM" | "Weight" | "Reps" | "RPE";
type ProgressTimeRange = "Week" | "Month" | "All-time";
type LiftType = "Bench Press" | "Back Squat" | "Deadlift" | "Overhead Press" | "Barbell Row";
type CardioMachine = "RowErg" | "BikeErg" | "SkiErg" | "Assault Bike";

const LIFT_OPTIONS: LiftType[] = ["Bench Press", "Back Squat", "Deadlift", "Overhead Press", "Barbell Row"];
const MACHINE_OPTIONS: CardioMachine[] = ["RowErg", "BikeErg", "SkiErg", "Assault Bike"];

type MasterDashboardProps = {
  userId: string;
};

function formatDateShort(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function e1rm(weightKg: number, reps: number) {
  return weightKg * (1 + reps / 30);
}

function isoToDate(iso: string) {
  return new Date(`${iso}T00:00:00`);
}

function withinLastDays(dateISO: string, days: number) {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const threshold = new Date(now);
  threshold.setDate(now.getDate() - days + 1);
  threshold.setHours(0, 0, 0, 0);
  const date = isoToDate(dateISO);
  return date >= threshold && date <= now;
}

function formatPace(secPerKm: number) {
  const safe = Math.max(0, Math.round(secPerKm));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}/km`;
}

function normalizeRunPace(run: { inputType: "TIME" | "PACE"; distanceMeters: number; timeSeconds?: number; paceSecPerKm?: number; rounds: number }) {
  if (run.inputType === "PACE") return run.paceSecPerKm ?? null;
  if (!run.timeSeconds || !run.distanceMeters) return null;
  const totalDistanceKm = (run.distanceMeters * (run.rounds || 1)) / 1000;
  if (totalDistanceKm <= 0) return null;
  return run.timeSeconds / totalDistanceKm;
}

export function MasterDashboard({ userId }: MasterDashboardProps) {
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>("Lifts");
  const [selectedLift, setSelectedLift] = useState<LiftType>("Bench Press");
  const [selectedMachine, setSelectedMachine] = useState<CardioMachine>("Assault Bike");
  const [selectedRunDistance, setSelectedRunDistance] = useState<number>(800);
  const [liftMetric, setLiftMetric] = useState<LiftMetric>("e1RM");
  const [progressTimeRange, setProgressTimeRange] = useState<ProgressTimeRange>("All-time");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminDashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const range = progressTimeRange === "Week" ? 30 : progressTimeRange === "Month" ? 90 : "All-time";
        const next = await fetchAdminDashboardData(userId, range);
        if (!cancelled) setData(next);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Failed to load admin dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, progressTimeRange]);

  const members = data?.members ?? [];

  const formatMemberLabel = (member: { userId: string; name: string; email: string | null }) => {
    if (member.email) return member.email;
    const displayName = member.name?.trim() || "Member";
    return `${displayName} (${member.userId.slice(0, 6)})`;
  };

  useEffect(() => {
    if (!members.length) return;
    if (selectedMember && members.some((m) => m.userId === selectedMember)) return;
    setSelectedMember(members[0].userId);
  }, [members, selectedMember]);

  const memberData = useMemo(() => {
    if (!data || !selectedMember) return { lifts: [], cardio: [], runs: [] };
    return data.memberData[selectedMember] ?? { lifts: [], cardio: [], runs: [] };
  }, [data, selectedMember]);

  const hasEnoughRPE = useMemo(() => {
    const rpeCount = memberData.lifts.filter((l) => l.lift === selectedLift && l.rpe !== undefined).length;
    return rpeCount >= 3;
  }, [memberData.lifts, selectedLift]);

  useEffect(() => {
    if (liftMetric === "RPE" && !hasEnoughRPE) setLiftMetric("e1RM");
  }, [liftMetric, hasEnoughRPE]);

  const liftSeries = useMemo(() => {
    const rangeDays = progressTimeRange === "Week" ? 7 : progressTimeRange === "Month" ? 30 : 9999;
    return memberData.lifts
      .filter((l) => l.lift === selectedLift)
      .filter((l) => progressTimeRange === "All-time" || withinLastDays(l.dateISO, rangeDays))
      .slice()
      .sort((a, b) => isoToDate(a.dateISO).getTime() - isoToDate(b.dateISO).getTime())
      .map((l) => {
        let value = 0;
        if (liftMetric === "e1RM") value = Math.round(e1rm(l.weightKg, l.reps) * 10) / 10;
        else if (liftMetric === "Weight") value = l.weightKg;
        else if (liftMetric === "Reps") value = l.reps;
        else value = l.rpe ?? 0;
        return { dateISO: l.dateISO, value, weightKg: l.weightKg, reps: l.reps, rpe: l.rpe };
      })
      .filter((row) => (liftMetric === "RPE" ? Boolean(row.rpe) : true));
  }, [memberData.lifts, selectedLift, progressTimeRange, liftMetric]);

  const cardioSeries = useMemo(() => {
    const rangeDays = progressTimeRange === "Week" ? 7 : progressTimeRange === "Month" ? 30 : 9999;
    return memberData.cardio
      .filter((c) => c.machine === selectedMachine)
      .filter((c) => progressTimeRange === "All-time" || withinLastDays(c.dateISO, rangeDays))
      .slice()
      .sort((a, b) => isoToDate(a.dateISO).getTime() - isoToDate(b.dateISO).getTime())
      .map((c) => ({ dateISO: c.dateISO, value: c.calories, seconds: c.seconds }));
  }, [memberData.cardio, selectedMachine, progressTimeRange]);

  const runSeries = useMemo(() => {
    const rangeDays = progressTimeRange === "Week" ? 7 : progressTimeRange === "Month" ? 30 : 9999;
    return memberData.runs
      .filter((r) => r.distanceMeters === selectedRunDistance)
      .filter((r) => progressTimeRange === "All-time" || withinLastDays(r.dateISO, rangeDays))
      .slice()
      .sort((a, b) => isoToDate(a.dateISO).getTime() - isoToDate(b.dateISO).getTime())
      .map((r) => ({ dateISO: r.dateISO, value: normalizeRunPace(r) ?? 0, rounds: r.rounds }))
      .filter((x) => x.value > 0);
  }, [memberData.runs, selectedRunDistance, progressTimeRange]);

  const progressBreadcrumb = useMemo(() => {
    if (progressFilter === "Lifts") return `Progress -> ${selectedLift}`;
    if (progressFilter === "Cardio") return `Progress -> ${selectedMachine}`;
    return `Progress -> Running (${selectedRunDistance}m)`;
  }, [progressFilter, selectedLift, selectedMachine, selectedRunDistance]);

  const activeMember = useMemo(() => members.find((m) => m.userId === selectedMember) ?? null, [members, selectedMember]);

  const recentLifts = useMemo(() => liftSeries.slice().reverse().slice(0, 6), [liftSeries]);
  const recentCardio = useMemo(() => cardioSeries.slice().reverse().slice(0, 6), [cardioSeries]);
  const recentRuns = useMemo(() => {
    return memberData.runs
      .filter((r) => r.distanceMeters === selectedRunDistance)
      .slice()
      .sort((a, b) => isoToDate(b.dateISO).getTime() - isoToDate(a.dateISO).getTime())
      .slice(0, 6);
  }, [memberData.runs, selectedRunDistance]);

  if (loading) {
    return (
      <GlassCard>
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          Loading master dashboard...
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard>
        <div className="text-sm font-semibold" style={{ color: colors.text }}>Could not load dashboard</div>
        <div className="text-xs mt-2" style={{ color: "var(--muted)" }}>{error}</div>
      </GlassCard>
    );
  }

  if (!data || !members.length) {
    return (
      <GlassCard>
        <div className="text-sm font-semibold" style={{ color: colors.text }}>No member data yet</div>
        <div className="text-xs mt-2" style={{ color: "var(--muted)" }}>
          Once members start logging workouts, this dashboard will populate automatically.
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Master Dashboard</div>
        <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          {activeMember ? `Viewing ${formatMemberLabel(activeMember)} • ${progressBreadcrumb}` : "Select a member"}
        </div>
      </div>

      <GlassCard>
        <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>
          Active Member
        </div>
        <select
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          className="w-full px-3 py-2 text-sm"
          style={{ background: "var(--surface)", border: "var(--border)", borderRadius: "var(--input-radius)", color: colors.text }}
        >
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {formatMemberLabel(m)}
            </option>
          ))}
        </select>
      </GlassCard>

      <SegmentedControl
        value={progressFilter}
        setValue={(v) => setProgressFilter(v as ProgressFilter)}
        options={[
          { label: "Lifts", value: "Lifts" },
          { label: "Cardio", value: "Cardio" },
          { label: "Running", value: "Running" },
        ]}
      />

      {progressFilter === "Lifts" ? (
        <>
          <GlassCard>
            <div className="space-y-3">
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>Lift</div>
                <select
                  value={selectedLift}
                  onChange={(e) => setSelectedLift(e.target.value as LiftType)}
                  className="w-full px-3 py-2 text-sm"
                  style={{ background: "var(--surface)", border: "var(--border)", borderRadius: "var(--input-radius)", color: colors.text }}
                >
                  {LIFT_OPTIONS.map((lift) => (
                    <option key={lift} value={lift}>{lift}</option>
                  ))}
                </select>
              </div>
              <SegmentedControl
                value={liftMetric}
                setValue={(v) => setLiftMetric(v as LiftMetric)}
                options={[
                  { label: "e1RM", value: "e1RM" },
                  { label: "Weight", value: "Weight" },
                  { label: "Reps", value: "Reps" },
                  ...(hasEnoughRPE ? [{ label: "RPE", value: "RPE" }] : []),
                ]}
              />
              <SegmentedControl
                value={progressTimeRange}
                setValue={(v) => setProgressTimeRange(v as ProgressTimeRange)}
                options={[
                  { label: "Week", value: "Week" },
                  { label: "Month", value: "Month" },
                  { label: "All-time", value: "All-time" },
                ]}
              />
            </div>
          </GlassCard>

          <GlassCard glow>
            <div className="flex items-center justify-between mb-4">
              <div className="text-base font-semibold">{selectedLift}</div>
              <div className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,255,0.15)", color: colors.accent }}>{liftMetric}</div>
            </div>
            <div className="h-48" style={{ width: "100%" }}>
              {liftSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height={192}>
                  {liftMetric === "RPE" ? (
                    <LineChart data={liftSeries} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="dateISO" tickFormatter={(v) => formatDateShort(v)} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false} minTickGap={22} />
                      <YAxis domain={[6, 10]} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false} width={28} />
                      <Tooltip
                        contentStyle={{ background: "rgba(10,10,14,0.95)", border: "var(--border)", borderRadius: "var(--input-radius)", color: colors.text }}
                        labelStyle={{ color: "var(--muted)" }}
                        formatter={(val: any, _name: any, ctx: any) => [`RPE ${val}`, `${ctx?.payload?.weightKg} kg x ${ctx?.payload?.reps}`]}
                      />
                      <Line type="monotone" dataKey="value" stroke="rgba(255,255,255,0.4)" strokeWidth={2} dot={{ r: 4, fill: colors.accent, strokeWidth: 2, stroke: colors.accent }} activeDot={{ r: 5, fill: colors.accent }} />
                    </LineChart>
                  ) : (
                    <AreaChart data={liftSeries} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="masterLiftArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={colors.accent} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="dateISO" tickFormatter={(v) => formatDateShort(v)} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false} minTickGap={22} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false} width={34} />
                      <Tooltip
                        contentStyle={{ background: "rgba(10,10,14,0.95)", border: "var(--border)", borderRadius: 12, color: colors.text }}
                        labelStyle={{ color: "var(--muted)" }}
                        formatter={(val: any, _name: any, ctx: any) => {
                          if (liftMetric === "Weight") return [`${val} kg`, `${ctx?.payload?.reps} reps${ctx?.payload?.rpe ? ` • RPE ${ctx?.payload?.rpe}` : ""}`];
                          if (liftMetric === "Reps") return [`${val} reps`, `${ctx?.payload?.weightKg} kg${ctx?.payload?.rpe ? ` • RPE ${ctx?.payload?.rpe}` : ""}`];
                          return [`${val} kg`, `e1RM • ${ctx?.payload?.weightKg}x${ctx?.payload?.reps}${ctx?.payload?.rpe ? ` • RPE ${ctx?.payload?.rpe}` : ""}`];
                        }}
                      />
                      <Area type="monotone" dataKey="value" stroke={colors.accent} strokeWidth={2.5} fill="url(#masterLiftArea)" dot={{ r: 3, fill: colors.accent, strokeWidth: 0 }} activeDot={{ r: 5, fill: colors.accent, strokeWidth: 2, stroke: colors.accent }} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center text-xs" style={{ color: "var(--muted)" }}>
                  No {selectedLift} data in this range.
                </div>
              )}
            </div>
          </GlassCard>

          <div className="space-y-3">
            {recentLifts.map((x, idx) => (
              <div key={`${x.dateISO}-${idx}`} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--surface)" }}>
                <div className="text-sm">{selectedLift}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{formatDateShort(x.dateISO)}</div>
                <div className="text-sm">{x.weightKg} kg x {x.reps}{x.rpe ? ` • RPE ${x.rpe}` : ""}</div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {progressFilter === "Cardio" ? (
        <>
          <GlassCard>
            <div className="space-y-3">
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>Machine</div>
                <select
                  value={selectedMachine}
                  onChange={(e) => setSelectedMachine(e.target.value as CardioMachine)}
                  className="w-full px-3 py-2 text-sm"
                  style={{ background: "var(--surface)", border: "var(--border)", borderRadius: "var(--input-radius)", color: colors.text }}
                >
                  {MACHINE_OPTIONS.map((machine) => (
                    <option key={machine} value={machine}>{machine}</option>
                  ))}
                </select>
              </div>
              <SegmentedControl
                value={progressTimeRange}
                setValue={(v) => setProgressTimeRange(v as ProgressTimeRange)}
                options={[
                  { label: "Week", value: "Week" },
                  { label: "Month", value: "Month" },
                  { label: "All-time", value: "All-time" },
                ]}
              />
            </div>
          </GlassCard>

          <GlassCard glow>
            <div className="flex items-center justify-between mb-4">
              <div className="text-base font-semibold">{selectedMachine}</div>
              <div className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,255,0.15)", color: colors.accent }}>60s max cals</div>
            </div>
            <div className="h-48" style={{ width: "100%" }}>
              {cardioSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height={192}>
                  <AreaChart data={cardioSeries} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="masterCardioArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.accent} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="dateISO" tickFormatter={(v) => formatDateShort(v)} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false} minTickGap={22} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false} width={34} />
                    <Tooltip
                      contentStyle={{ background: "rgba(10,10,14,0.95)", border: "var(--border)", borderRadius: 12, color: colors.text }}
                      labelStyle={{ color: "var(--muted)" }}
                      formatter={(val: any, _name: any, ctx: any) => [`${val} cal`, `${ctx?.payload?.seconds ?? 60}s effort`]}
                    />
                    <Area type="monotone" dataKey="value" stroke={colors.accent} strokeWidth={2.5} fill="url(#masterCardioArea)" dot={{ r: 3, fill: colors.accent, strokeWidth: 0 }} activeDot={{ r: 5, fill: colors.accent, strokeWidth: 2, stroke: colors.accent }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center text-xs" style={{ color: "var(--muted)" }}>
                  No {selectedMachine} data in this range.
                </div>
              )}
            </div>
          </GlassCard>

          <div className="space-y-3">
            {recentCardio.map((x, idx) => (
              <div key={`${x.dateISO}-${idx}`} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--surface)" }}>
                <div className="text-sm">{selectedMachine}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{formatDateShort(x.dateISO)} • {x.seconds}s</div>
                <div className="text-sm">{x.value} cal</div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {progressFilter === "Running" ? (
        <>
          <GlassCard>
            <div className="space-y-3">
              <div>
                <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>Distance preset</div>
                <select
                  value={String(selectedRunDistance)}
                  onChange={(e) => setSelectedRunDistance(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm"
                  style={{ background: "var(--surface)", border: "var(--border)", borderRadius: "var(--input-radius)", color: colors.text }}
                >
                  {[200, 400, 600, 800, 1000].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <SegmentedControl
                value={progressTimeRange}
                setValue={(v) => setProgressTimeRange(v as ProgressTimeRange)}
                options={[
                  { label: "Week", value: "Week" },
                  { label: "Month", value: "Month" },
                  { label: "All-time", value: "All-time" },
                ]}
              />
            </div>
          </GlassCard>

          <GlassCard glow>
            <div className="flex items-center justify-between mb-4">
              <div className="text-base font-semibold">Running • {selectedRunDistance}m</div>
              <div className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,255,0.15)", color: colors.accent }}>pace</div>
            </div>
            <div className="h-48" style={{ width: "100%" }}>
              {runSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height={192}>
                  <LineChart data={runSeries} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="dateISO" tickFormatter={(v) => formatDateShort(v)} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false} minTickGap={22} />
                    <YAxis tickFormatter={(v) => formatPace(Number(v)).replace("/km", "")} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false} width={44} />
                    <Tooltip
                      contentStyle={{ background: "rgba(10,10,14,0.95)", border: "var(--border)", borderRadius: 12, color: colors.text }}
                      labelStyle={{ color: "var(--muted)" }}
                      formatter={(val: any, _name: any, ctx: any) => [formatPace(Number(val)), `${ctx?.payload?.rounds ?? 1} rounds`]}
                    />
                    <Line type="monotone" dataKey="value" stroke={colors.accent} strokeWidth={2.5} dot={{ r: 3, fill: colors.accent }} activeDot={{ r: 5, fill: colors.accent }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center text-xs" style={{ color: "var(--muted)" }}>
                  No running data for {selectedRunDistance}m in this range.
                </div>
              )}
            </div>
            <div className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
              Lower pace is better.
            </div>
          </GlassCard>

          <div className="space-y-3">
            {recentRuns.map((r) => {
              const pace = normalizeRunPace(r);
              return (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--surface)" }}>
                  <div className="text-sm">Run {r.distanceMeters}m</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{formatDateShort(r.dateISO)} • {r.rounds} round{r.rounds === 1 ? "" : "s"}</div>
                  <div className="text-sm">{pace ? formatPace(pace) : "—"}</div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
