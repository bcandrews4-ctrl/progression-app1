import React, { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { GlassCard } from "./GlassCard";
import { MetricTile } from "./MetricTile";
import { SegmentedControl } from "./SegmentedControl";
import { colors } from "../styles/tokens";
import { fetchAdminDashboardData, type AdminDashboardData } from "../lib/db";

type RangeOption = 30 | 90 | 365;

function formatWeekLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

type MasterDashboardProps = {
  userId: string;
};

export function MasterDashboard({ userId }: MasterDashboardProps) {
  const [range, setRange] = useState<RangeOption>(90);
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminDashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
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
  }, [userId, range]);

  const selectedBreakout = useMemo(() => {
    if (!data) return [];
    if (selectedMember === "all") return data.weeklyTrend.map((w) => ({ weekStartISO: w.weekStartISO, workouts: w.workouts }));
    return data.memberBreakout[selectedMember] ?? [];
  }, [data, selectedMember]);

  const leaderboard = useMemo(() => {
    if (!data) return [];
    return data.progressionDistribution.slice(0, 6);
  }, [data]);

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

  if (!data || data.members.length === 0) {
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Master Dashboard</div>
          <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Cross-member progression overview
          </div>
        </div>
        <SegmentedControl
          value={String(range)}
          setValue={(v) => setRange(Number(v) as RangeOption)}
          options={[
            { label: "30d", value: "30" },
            { label: "90d", value: "90" },
            { label: "Year", value: "365" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricTile title="Active Members" value={String(data.kpis.totalActiveMembers)} />
        <MetricTile title="Workouts Logged" value={String(data.kpis.workoutsLogged)} />
        <MetricTile title="Avg Weekly Sessions" value={data.kpis.avgWeeklySessions.toFixed(1)} />
        <MetricTile title="Avg Strength Delta" value={`${data.kpis.avgTrendDeltaKg.toFixed(1)} kg`} />
      </div>

      <GlassCard glow>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Weekly Volume Trend</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>All members</div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.weeklyTrend}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="weekStartISO" tickFormatter={formatWeekLabel} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} width={32} />
              <Tooltip
                labelFormatter={(label) => `Week of ${formatWeekLabel(String(label))}`}
                contentStyle={{ background: "rgba(10,10,14,0.95)", border: "var(--border)", borderRadius: 12, color: colors.text }}
              />
              <Line dataKey="workouts" type="monotone" stroke={colors.accent} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="text-sm font-semibold mb-3">Progression Distribution</div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.progressionDistribution.slice(0, 12)}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} width={36} />
              <Tooltip
                formatter={(value: any) => [`${Number(value).toFixed(1)} kg`, "Strength delta"]}
                contentStyle={{ background: "rgba(10,10,14,0.95)", border: "var(--border)", borderRadius: 12, color: colors.text }}
              />
              <Bar dataKey="strengthDeltaKg" fill={colors.accent} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="text-sm font-semibold">Member Breakout</div>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="px-3 py-2 text-sm"
            style={{ background: "var(--surface)", border: "var(--border)", borderRadius: "var(--input-radius)", color: colors.text }}
          >
            <option value="all">All members</option>
            {data.members.map((m) => (
              <option key={m.userId} value={m.userId}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={selectedBreakout}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="weekStartISO" tickFormatter={formatWeekLabel} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} width={32} />
              <Tooltip
                labelFormatter={(label) => `Week of ${formatWeekLabel(String(label))}`}
                contentStyle={{ background: "rgba(10,10,14,0.95)", border: "var(--border)", borderRadius: 12, color: colors.text }}
              />
              <Line dataKey="workouts" type="monotone" stroke={colors.accent} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="text-sm font-semibold mb-3">Top Performers</div>
        <div className="space-y-2">
          {leaderboard.map((row) => (
            <div key={row.userId} className="flex items-center justify-between text-sm">
              <span style={{ color: colors.text }}>{row.name}</span>
              <span style={{ color: "var(--muted)" }}>
                {row.strengthDeltaKg.toFixed(1)} kg delta • {row.workouts} workouts
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
