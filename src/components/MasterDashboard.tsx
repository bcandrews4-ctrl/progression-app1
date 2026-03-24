import React, { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { GlassCard } from "./GlassCard";
import { SegmentedControl } from "./SegmentedControl";
import { colors } from "../styles/tokens";
import { fetchAdminDashboardData, type AdminDashboardData } from "../lib/db";

type RangeOption = 30 | 90 | 365 | "All-time";
type MasterMetric = "Running" | "Bench Press" | "Squat";
const ALL_USERS = "ALL_USERS";

type MasterDashboardProps = {
  userId: string;
};

function formatDateLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function formatPace(secPerKm: number) {
  const safe = Math.max(0, Math.round(secPerKm));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}/km`;
}

export function MasterDashboard({ userId }: MasterDashboardProps) {
  const [range, setRange] = useState<RangeOption>("All-time");
  const [selectedMember, setSelectedMember] = useState<string>(ALL_USERS);
  const [metric, setMetric] = useState<MasterMetric>("Running");
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

  const members = data?.members ?? [];

  const formatMemberLabel = (member: { userId: string; name: string; email: string | null }) => {
    if (member.email) return member.email;
    const displayName = member.name?.trim() || "Member";
    return `${displayName} (${member.userId.slice(0, 6)})`;
  };

  useEffect(() => {
    if (!data) return;
    const source = data.members;
    if (source.length === 0) return;
    if (selectedMember === ALL_USERS) return;
    if (selectedMember && source.some((m) => m.userId === selectedMember)) return;
    setSelectedMember(source[0].userId);
  }, [data, selectedMember]);

  const activeMember = useMemo(
    () => (selectedMember === ALL_USERS ? null : data?.members.find((m) => m.userId === selectedMember) ?? null),
    [data, selectedMember],
  );

  const selectedSeries = useMemo(() => {
    if (!data || !selectedMember || selectedMember === ALL_USERS) return null;
    return data.memberSeries[selectedMember] ?? null;
  }, [data, selectedMember]);

  const aggregatedSeriesRaw = useMemo(() => {
    if (!data || selectedMember !== ALL_USERS) return [];
    const pointsByDate = new Map<string, number[]>();
    const allSeries = Object.values(data.memberSeries);
    for (const series of allSeries) {
      const points =
        metric === "Bench Press"
          ? series.benchE1rmSeries
          : metric === "Squat"
            ? series.squatE1rmSeries
            : series.runPace1kmSeries;
      for (const point of points) {
        const dateISO = String(point.dateISO ?? "");
        const value = Number(point.value);
        if (!dateISO || !Number.isFinite(value)) continue;
        const values = pointsByDate.get(dateISO) ?? [];
        values.push(value);
        pointsByDate.set(dateISO, values);
      }
    }
    return Array.from(pointsByDate.entries())
      .map(([dateISO, values]) => ({
        dateISO,
        value: values.reduce((sum, v) => sum + v, 0) / values.length,
      }))
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  }, [data, selectedMember, metric]);

  const activeSeriesRaw = useMemo(() => {
    if (selectedMember === ALL_USERS) return aggregatedSeriesRaw;
    if (!selectedSeries) return [];
    if (metric === "Bench Press") return selectedSeries.benchE1rmSeries;
    if (metric === "Squat") return selectedSeries.squatE1rmSeries;
    return selectedSeries.runPace1kmSeries;
  }, [selectedSeries, metric, selectedMember, aggregatedSeriesRaw]);

  const activeSeries = useMemo(
    () =>
      activeSeriesRaw.filter((p) => {
        const hasDate = typeof p.dateISO === "string" && p.dateISO.length >= 10;
        const hasValue = Number.isFinite(Number(p.value));
        return hasDate && hasValue;
      }),
    [activeSeriesRaw],
  );

  const activeMemberSummary = useMemo(
    () => data?.members.find((m) => m.userId === selectedMember) ?? null,
    [data, selectedMember],
  );

  const yLabel = metric === "Running" ? "Pace" : "e1RM";
  const chartTitlePrefix = metric === "Running" ? "Running (1km pace)" : `${metric} e1RM`;
  const chartTitle = selectedMember === ALL_USERS ? `${chartTitlePrefix} - All users` : chartTitlePrefix;
  const chartTag = metric === "Running" ? "Pace" : "e1RM";
  const audienceCopy = selectedMember === ALL_USERS ? "all users" : "this user";
  const emptyCopy =
    metric === "Running"
      ? `No running pace data for ${audienceCopy}${range === "All-time" ? "." : " in the selected range."}`
      : `No ${metric} data for ${audienceCopy}${range === "All-time" ? "." : " in the selected range."}`;

  useEffect(() => {
    if (!activeMember) return;
    console.debug("[MasterDashboard:chart] active series state", {
      userId: activeMember.userId,
      email: activeMember.email,
      metric,
      range,
      rawPoints: activeSeriesRaw.length,
      validPoints: activeSeries.length,
      sample: activeSeriesRaw.slice(0, 2),
    });
  }, [activeMember, metric, range, activeSeriesRaw, activeSeries]);

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
      <div>
        <div className="text-2xl font-semibold">Master Dashboard</div>
        <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          Select a user and switch progress metric.
        </div>
      </div>

      <GlassCard>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>
              Active User
            </div>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full px-3 py-2 text-sm"
              style={{ background: "var(--surface)", border: "var(--border)", borderRadius: "var(--input-radius)", color: colors.text }}
            >
              <option value={ALL_USERS}>All users (aggregate)</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {formatMemberLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:justify-self-end">
            <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>
              Range
            </div>
            <SegmentedControl
              value={String(range)}
              setValue={(v) => {
                if (v === "All-time") {
                  setRange("All-time");
                  return;
                }
                setRange(Number(v) as RangeOption);
              }}
              options={[
                { label: "30d", value: "30" },
                { label: "90d", value: "90" },
                { label: "Year", value: "365" },
                { label: "All-time", value: "All-time" },
              ]}
            />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>
            Metric
          </div>
          <SegmentedControl
            value={metric}
            setValue={(v) => setMetric(v as MasterMetric)}
            options={[
              { label: "Running", value: "Running" },
              { label: "Bench Press", value: "Bench Press" },
              { label: "Squat", value: "Squat" },
            ]}
          />
        </div>

        {selectedMember === ALL_USERS ? (
          <div className="text-xs mt-3" style={{ color: "var(--muted)" }}>
            Aggregated across {members.length} user{members.length === 1 ? "" : "s"}
          </div>
        ) : activeMember ? (
          <div className="text-xs mt-3" style={{ color: "var(--muted)" }}>
            {activeMember.name} {activeMember.trainingFocus ? `• ${activeMember.trainingFocus}` : ""}
          </div>
        ) : null}
      </GlassCard>

      <GlassCard glow>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold">{chartTitle}</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {selectedMember === ALL_USERS ? "Aggregated trend across all members" : (activeMemberSummary ? formatMemberLabel(activeMemberSummary) : "Selected user")}
            </div>
          </div>
          <div
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,0,255,0.15)", color: colors.accent }}
          >
            {chartTag}
          </div>
        </div>

        <div className="h-64">
          {activeSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeSeries}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="dateISO" tickFormatter={formatDateLabel} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickFormatter={(v) => (metric === "Running" ? formatPace(Number(v)) : `${Number(v).toFixed(0)}kg`)}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  width={56}
                />
                <Tooltip
                  formatter={(value: any) => [
                    metric === "Running" ? formatPace(Number(value)) : `${Number(value).toFixed(1)} kg`,
                    yLabel,
                  ]}
                  labelFormatter={(label) => formatDateLabel(String(label))}
                  contentStyle={{ background: "rgba(10,10,14,0.95)", border: "var(--border)", borderRadius: 12, color: colors.text }}
                />
                <Line dataKey="value" type="monotone" stroke={colors.accent} strokeWidth={2.6} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center text-xs" style={{ color: "var(--muted)" }}>
              {activeSeriesRaw.length > 0
                ? "Data exists but contains invalid chart points. Check normalization logs in console."
                : emptyCopy}
            </div>
          )}
        </div>
      </GlassCard>

      <div className="text-xs" style={{ color: "var(--muted)" }}>
        Tip: choose a specific user or All users, then switch Running/Bench/Squat to compare trends quickly.
      </div>
    </div>
  );
}
