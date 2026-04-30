import React, { useState, useEffect } from "react";
import { radii } from "../styles/tokens";
import { useTheme } from "../hooks/useTheme";
import { AreaChart } from "./AreaChart";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { fetchAdminDashboardData, AdminMemberSummary, AdminMemberData, LiftEntry, CardioEntry, RunEntry, ImportedWorkout } from "../lib/db";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiftSeries {
  label: string;
  value: number;
}

interface CardioSummary {
  machine: string;
  sessions: number;
  totalMinutes: number;
  totalCalories: number;
  lastDate: string;
}

interface RecentRun {
  dateISO: string;
  distanceKm: number;
  paceStr: string;
}

interface RunSummary {
  totalRuns: number;
  totalDistanceKm: number;
  bestPaceSecPerKm: number | null;
  recentRuns: RecentRun[];
  paceSeries: { label: string; value: number }[];
}

interface ImportedSummary {
  source: string;
  sessions: number;
  totalMinutes: number;
  totalCalories: number;
  lastDate: string;
}

interface Member {
  id: string;
  name: string;
  email: string | null;
  focus: string;
  streak: number;
  workouts: number;
  liftCount: number;
  cardioCount: number;
  runCount: number;
  importedCount: number;
  lastSeen: string;
  status: "active" | "inactive";
  lifts: Record<string, LiftSeries[]>;
  cardioSummary: CardioSummary[];
  runSummary: RunSummary | null;
  importedSummary: ImportedSummary[];
}

type ActivityTab = "Lifts" | "Cardio" | "Runs" | "Imported";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLastSeen(dateISO: string | null): string {
  if (!dateISO) return "Never";
  const diffDays = Math.round(
    (Date.now() - new Date(dateISO + "T00:00:00").getTime()) / 86_400_000
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.round(diffDays / 7)}w ago`;
  return `${Math.round(diffDays / 30)}mo ago`;
}

function computeStreak(allDates: string[]): number {
  const unique = [...new Set(allDates)].sort().reverse();
  if (!unique.length) return 0;
  let streak = 0;
  let expected = new Date().toISOString().slice(0, 10);
  for (const d of unique) {
    if (d === expected) {
      streak++;
      const prev = new Date(expected + "T00:00:00");
      prev.setDate(prev.getDate() - 1);
      expected = prev.toISOString().slice(0, 10);
    } else if (d < expected) {
      break;
    }
  }
  return streak;
}

function buildLiftSeries(lifts: LiftEntry[]): Record<string, LiftSeries[]> {
  const byType: Record<string, Record<string, number>> = {};
  for (const l of lifts) {
    if (!byType[l.lift]) byType[l.lift] = {};
    const month = l.dateISO.slice(0, 7);
    byType[l.lift][month] = Math.max(byType[l.lift][month] ?? 0, l.weightKg);
  }
  const result: Record<string, LiftSeries[]> = {};
  for (const [type, byMonth] of Object.entries(byType)) {
    const series = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ label: month.slice(5), value }));
    if (series.length >= 2) result[type] = series;
  }
  return Object.fromEntries(
    Object.entries(result)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 3)
  );
}

function buildCardioSummary(cardio: CardioEntry[]): CardioSummary[] {
  const byMachine: Record<string, CardioEntry[]> = {};
  for (const entry of cardio) {
    if (!byMachine[entry.machine]) byMachine[entry.machine] = [];
    byMachine[entry.machine].push(entry);
  }
  return Object.entries(byMachine)
    .map(([machine, entries]) => ({
      machine,
      sessions: entries.length,
      totalMinutes: Math.round(entries.reduce((s, e) => s + e.seconds, 0) / 60),
      totalCalories: entries.reduce((s, e) => s + e.calories, 0),
      lastDate: entries.map((e) => e.dateISO).sort().reverse()[0],
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

function fmtPace(secPerKm: number): string {
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${String(secs).padStart(2, "0")}/km`;
}

function buildRunSummary(runs: RunEntry[]): RunSummary | null {
  if (!runs.length) return null;
  const totalDistanceKm = runs.reduce((s, r) => s + (r.distanceMeters * r.rounds) / 1000, 0);
  const paces = runs
    .map((r) => r.paceSecPerKm ?? null)
    .filter((p): p is number => p !== null);
  const bestPaceSecPerKm = paces.length ? Math.min(...paces) : null;
  const sorted = runs.slice().sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const recentRuns: RecentRun[] = sorted
    .slice()
    .reverse()
    .slice(0, 5)
    .map((r) => ({
      dateISO: r.dateISO,
      distanceKm: +((r.distanceMeters * r.rounds) / 1000).toFixed(2),
      paceStr: r.paceSecPerKm ? fmtPace(r.paceSecPerKm) : "—",
    }));
  // Pace series: one point per run that has pace data, sorted oldest→newest
  // Invert to speed (km/h) so the chart goes UP as the member improves
  const paceSeries = sorted
    .filter((r) => r.paceSecPerKm != null && r.paceSecPerKm > 0)
    .map((r) => ({
      label: r.dateISO.slice(5).replace("-", "/"),
      value: +((1000 / r.paceSecPerKm!) * 3.6).toFixed(2), // pace sec/km → km/h
    }));
  return { totalRuns: runs.length, totalDistanceKm: +totalDistanceKm.toFixed(2), bestPaceSecPerKm, recentRuns, paceSeries };
}

function buildImportedSummary(imported: ImportedWorkout[]): ImportedSummary[] {
  const bySource: Record<string, ImportedWorkout[]> = {};
  for (const entry of imported) {
    if (!bySource[entry.source]) bySource[entry.source] = [];
    bySource[entry.source].push(entry);
  }
  return Object.entries(bySource)
    .map(([source, entries]) => ({
      source,
      sessions: entries.length,
      totalMinutes: entries.reduce((s, e) => s + e.minutes, 0),
      totalCalories: entries.reduce((s, e) => s + (e.activeCalories ?? 0), 0),
      lastDate: entries.map((e) => e.dateISO).sort().reverse()[0],
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

function buildMember(summary: AdminMemberSummary, data: AdminMemberData): Member {
  const allDates = [
    ...data.lifts.map((l) => l.dateISO),
    ...data.runs.map((r) => r.dateISO),
    ...data.cardio.map((c) => c.dateISO),
    ...(data.imported ?? []).map((w) => w.dateISO),
  ];
  const uniqueDates = [...new Set(allDates)].sort();
  const lastDate = uniqueDates[uniqueDates.length - 1] ?? null;
  const diffDays = lastDate
    ? Math.round((Date.now() - new Date(lastDate + "T00:00:00").getTime()) / 86_400_000)
    : 999;
  return {
    id: summary.userId,
    name: summary.name,
    email: summary.email,
    focus: summary.trainingFocus ?? "Member",
    streak: computeStreak(allDates),
    workouts: uniqueDates.length,
    liftCount: data.lifts.length,
    cardioCount: data.cardio.length,
    runCount: data.runs.length,
    importedCount: (data.imported ?? []).length,
    lastSeen: formatLastSeen(lastDate),
    status: diffDays <= 7 ? "active" : "inactive",
    lifts: buildLiftSeries(data.lifts),
    cardioSummary: buildCardioSummary(data.cardio),
    runSummary: buildRunSummary(data.runs),
    importedSummary: buildImportedSummary(data.imported ?? []),
  };
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size }: { name: string; size: number }) {
  const { c } = useTheme();
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: c.accentSoft, border: `1px solid ${c.accentBorder}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: c.accent,
    }}>
      {initials}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CoachPortalProps {
  onExit: () => void;
  userId: string;
  isAdmin: boolean;
}

export function CoachPortal({ onExit, userId, isAdmin }: CoachPortalProps) {
  const { c } = useTheme();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [liftKey, setLiftKey] = useState("");
  const [activityTab, setActivityTab] = useState<ActivityTab>("Lifts");

  useEffect(() => {
    if (!isAdmin) return;
    fetchAdminDashboardData(userId, "All-time")
      .then(({ members: summaries, memberData }) => {
        const built = summaries
          .map((s) => buildMember(s, memberData[s.userId] ?? { lifts: [], cardio: [], runs: [], imported: [] }))
          .sort((a, b) => {
            if (a.status !== b.status) return a.status === "active" ? -1 : 1;
            return b.workouts - a.workouts;
          });
        setMembers(built);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load member data"))
      .finally(() => setLoading(false));
  }, [userId, isAdmin]);

  if (!isAdmin) return null;

  // ── Member detail view ───────────────────────────────────────────────────
  if (member) {
    const liftKeys = Object.keys(member.lifts);
    const activeLiftKey = liftKeys.includes(liftKey) ? liftKey : liftKeys[0] ?? "";
    const liftData = activeLiftKey ? member.lifts[activeLiftKey] : [];
    const vals = liftData.map((d) => d.value);
    const changePct = vals.length >= 2
      ? (((vals[vals.length - 1] - vals[0]) / vals[0]) * 100).toFixed(1)
      : null;

    // Determine which tabs to show
    const tabs: ActivityTab[] = [];
    if (member.liftCount > 0) tabs.push("Lifts");
    if (member.cardioCount > 0) tabs.push("Cardio");
    if (member.runCount > 0) tabs.push("Runs");
    if (member.importedCount > 0) tabs.push("Imported");
    const safeTab: ActivityTab = tabs.includes(activityTab) ? activityTab : (tabs[0] ?? "Lifts");

    const tabCount: Record<ActivityTab, number> = {
      Lifts: member.liftCount,
      Cardio: member.cardioCount,
      Runs: member.runCount,
      Imported: member.importedCount,
    };

    return (
      <div style={{ height: "100dvh", background: c.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "calc(16px + env(safe-area-inset-top, 0px)) 16px 16px", borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
          <button onClick={() => setMember(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px" }}>
            <ChevronLeft size={22} color={c.muted} />
          </button>
          <Avatar name={member.name} size={32} />
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: c.text }}>{member.name}</div>
            <div style={{ fontSize: "11px", color: c.muted }}>{member.focus} · {member.workouts} sessions</div>
          </div>
          <div style={{
            marginLeft: "auto", padding: "4px 10px", borderRadius: radii.pill, fontSize: "11px", fontWeight: 600,
            background: `${member.status === "active" ? c.green : c.muted2}22`,
            color: member.status === "active" ? c.green : c.muted2,
            border: `1px solid ${member.status === "active" ? c.green : c.muted2}44`,
          }}>
            {member.lastSeen}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 40px" }}>
          {/* Stats tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "10px" }}>
            {[
              { label: "Streak", value: `${member.streak}d` },
              { label: "Sessions", value: member.workouts },
              { label: "Status", value: member.status === "active" ? "Active" : "Inactive" },
            ].map((s) => (
              <div key={s.label} style={{ background: c.cardBg2, borderRadius: radii.card, border: `1px solid ${c.border}`, padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: 700, color: c.text }}>{s.value}</div>
                <div style={{ fontSize: "10px", color: c.muted }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Activity breakdown */}
          <div style={{ fontSize: "12px", color: c.muted, marginBottom: "14px", textAlign: "center" }}>
            {[
              member.liftCount > 0 && `${member.liftCount} lift sets`,
              member.cardioCount > 0 && `${member.cardioCount} cardio`,
              member.runCount > 0 && `${member.runCount} runs`,
              member.importedCount > 0 && `${member.importedCount} imported`,
            ].filter(Boolean).join(" · ") || "No entries yet"}
          </div>

          {/* Activity type tabs */}
          {tabs.length > 1 && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActivityTab(tab)}
                  style={{
                    flex: 1, padding: "8px 4px", borderRadius: radii.pill, fontSize: "12px", fontWeight: 600,
                    background: safeTab === tab ? c.accent : "rgba(255,255,255,0.05)",
                    border: `1px solid ${safeTab === tab ? c.accent : c.border}`,
                    color: safeTab === tab ? "#fff" : c.muted, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {tab} <span style={{ opacity: 0.75 }}>({tabCount[tab]})</span>
                </button>
              ))}
            </div>
          )}

          {/* ── LIFTS TAB ── */}
          {safeTab === "Lifts" && (
            <>
              {liftKeys.length > 0 ? (
                <>
                  <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "14px 12px 10px", marginBottom: "14px" }}>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "10px", overflowX: "auto" }}>
                      {liftKeys.map((k) => (
                        <button
                          key={k}
                          onClick={() => setLiftKey(k)}
                          style={{
                            flexShrink: 0, padding: "6px 12px", borderRadius: radii.pill, fontSize: "12px", fontWeight: 500,
                            background: activeLiftKey === k ? c.accent : "rgba(255,255,255,0.05)",
                            border: `1px solid ${activeLiftKey === k ? c.accent : c.border}`,
                            color: activeLiftKey === k ? "#fff" : c.muted, cursor: "pointer", fontFamily: "inherit",
                          }}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: "12px", color: c.muted, marginBottom: "6px" }}>
                      Max weight — {activeLiftKey}
                      {changePct !== null && (
                        <span style={{ color: parseFloat(changePct) >= 0 ? c.green : c.red, fontWeight: 600 }}>
                          {" "}{parseFloat(changePct) >= 0 ? "+" : ""}{changePct}%
                        </span>
                      )}
                    </div>
                    <AreaChart data={liftData} height={120} />
                  </div>

                  <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "14px 16px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: c.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                      All lifts — monthly peak
                    </div>
                    {liftKeys.map((lift, i, arr) => {
                      const series = member.lifts[lift];
                      const latest = series[series.length - 1]?.value ?? 0;
                      const first = series[0]?.value ?? 0;
                      const pct = first > 0 ? (((latest - first) / first) * 100).toFixed(1) : null;
                      return (
                        <div key={lift} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${c.border}` : "none",
                        }}>
                          <div style={{ fontSize: "14px", color: c.text, fontWeight: 500 }}>{lift}</div>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <div style={{ fontSize: "16px", fontWeight: 700, color: c.text }}>{latest}kg</div>
                            {pct !== null && (
                              <div style={{
                                padding: "2px 8px", borderRadius: radii.pill, fontSize: "11px", fontWeight: 600,
                                background: `${parseFloat(pct) >= 0 ? c.green : c.red}22`,
                                color: parseFloat(pct) >= 0 ? c.green : c.red,
                                border: `1px solid ${parseFloat(pct) >= 0 ? c.green : c.red}44`,
                              }}>
                                {parseFloat(pct) >= 0 ? "+" : ""}{pct}%
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "24px", textAlign: "center" }}>
                  <div style={{ fontSize: "13px", color: c.muted }}>No lift data recorded yet.</div>
                </div>
              )}
            </>
          )}

          {/* ── CARDIO TAB ── */}
          {safeTab === "Cardio" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {member.cardioSummary.length > 0 ? member.cardioSummary.map((cs) => {
                const hrs = Math.floor(cs.totalMinutes / 60);
                const mins = cs.totalMinutes % 60;
                const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                return (
                  <div key={cs.machine} style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: c.text }}>{cs.machine}</div>
                      <div style={{ padding: "2px 8px", borderRadius: radii.pill, fontSize: "11px", fontWeight: 600, background: `${c.accent}22`, color: c.accent, border: `1px solid ${c.accentBorder}` }}>
                        {cs.sessions} sessions
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                      {[
                        { label: "Total time", value: timeStr },
                        { label: "Calories", value: cs.totalCalories > 0 ? `${cs.totalCalories} kcal` : "—" },
                        { label: "Last session", value: formatLastSeen(cs.lastDate) },
                      ].map((stat) => (
                        <div key={stat.label} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: c.text }}>{stat.value}</div>
                          <div style={{ fontSize: "10px", color: c.muted, marginTop: "2px" }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }) : (
                <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "24px", textAlign: "center" }}>
                  <div style={{ fontSize: "13px", color: c.muted }}>No cardio data recorded yet.</div>
                </div>
              )}
            </div>
          )}

          {/* ── RUNS TAB ── */}
          {safeTab === "Runs" && member.runSummary && (
            <>
              {/* Speed progression chart */}
              {member.runSummary.paceSeries.length >= 2 && (
                <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "14px 12px 10px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: c.muted2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Average Pace (km/h)
                    </div>
                    {(() => {
                      const s = member.runSummary!.paceSeries;
                      const first = s[0].value, last = s[s.length - 1].value;
                      const pct = (((last - first) / first) * 100).toFixed(1);
                      const up = last >= first;
                      return (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <div style={{ padding: "2px 8px", borderRadius: radii.pill, fontSize: "11px", fontWeight: 600, background: `${up ? c.green : c.red}22`, color: up ? c.green : c.red, border: `1px solid ${up ? c.green : c.red}44` }}>
                            {up ? "+" : ""}{pct}%
                          </div>
                          <div style={{ padding: "2px 8px", borderRadius: radii.pill, fontSize: "11px", fontWeight: 600, background: `${c.accent}22`, color: c.accent, border: `1px solid ${c.accentBorder}` }}>
                            {s.length} runs
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <AreaChart data={member.runSummary.paceSeries} height={120} />
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "14px" }}>
                {[
                  { label: "Total runs", value: String(member.runSummary.totalRuns) },
                  { label: "Distance", value: `${member.runSummary.totalDistanceKm} km` },
                  { label: "Best pace", value: member.runSummary.bestPaceSecPerKm ? fmtPace(member.runSummary.bestPaceSecPerKm) : "—" },
                ].map((s) => (
                  <div key={s.label} style={{ background: c.cardBg2, borderRadius: radii.card, border: `1px solid ${c.border}`, padding: "12px", textAlign: "center" }}>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: c.text }}>{s.value}</div>
                    <div style={{ fontSize: "10px", color: c.muted }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "14px 16px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: c.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
                  Recent runs
                </div>
                {member.runSummary.recentRuns.map((run, i, arr) => (
                  <div key={run.dateISO + i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${c.border}` : "none",
                  }}>
                    <div style={{ fontSize: "13px", color: c.muted }}>{formatLastSeen(run.dateISO)}</div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: c.text }}>{run.distanceKm} km</div>
                      <div style={{ fontSize: "12px", color: c.muted }}>{run.paceStr}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── IMPORTED TAB ── */}
          {safeTab === "Imported" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {member.importedSummary.length > 0 ? member.importedSummary.map((imp) => {
                const hrs = Math.floor(imp.totalMinutes / 60);
                const mins = imp.totalMinutes % 60;
                const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                return (
                  <div key={imp.source} style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: c.text }}>{imp.source}</div>
                      <div style={{ padding: "2px 8px", borderRadius: radii.pill, fontSize: "11px", fontWeight: 600, background: `${c.accent}22`, color: c.accent, border: `1px solid ${c.accentBorder}` }}>
                        {imp.sessions} sessions
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                      {[
                        { label: "Total time", value: timeStr },
                        { label: "Calories", value: imp.totalCalories > 0 ? `${imp.totalCalories} kcal` : "—" },
                        { label: "Last sync", value: formatLastSeen(imp.lastDate) },
                      ].map((stat) => (
                        <div key={stat.label} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: c.text }}>{stat.value}</div>
                          <div style={{ fontSize: "10px", color: c.muted, marginTop: "2px" }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }) : (
                <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "24px", textAlign: "center" }}>
                  <div style={{ fontSize: "13px", color: c.muted }}>No imported workouts yet.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Member list view ──────────────────────────────────────────────────────
  const activeCount = members.filter((m) => m.status === "active").length;
  const inactiveCount = members.filter((m) => m.status === "inactive").length;
  const totalSessions = members.reduce((sum, m) => sum + m.workouts, 0);

  return (
    <div style={{ height: "100dvh", background: c.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "calc(16px + env(safe-area-inset-top, 0px)) 16px 16px", borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        <button onClick={onExit} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px" }}>
          <ChevronLeft size={22} color={c.muted} />
        </button>
        <div style={{ fontSize: "18px", fontWeight: 700, color: c.text }}>Coach Portal</div>
        <div style={{
          marginLeft: "auto", padding: "4px 10px", borderRadius: radii.pill, fontSize: "11px", fontWeight: 600,
          background: `${c.accent}22`, color: c.accent, border: `1px solid ${c.accentBorder}`,
        }}>
          {loading ? "…" : `${members.length} members`}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 40px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "48px 0", color: c.muted, fontSize: "14px" }}>
            Loading member data…
          </div>
        )}

        {error && (
          <div style={{ background: `${c.red}22`, border: `1px solid ${c.red}44`, borderRadius: radii.card, padding: "14px 16px", color: c.red, fontSize: "13px" }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: c.cardBg2, borderRadius: radii.card, border: `1px solid ${c.border}`, padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "22px", fontWeight: 700, color: c.green }}>{activeCount}</div>
                <div style={{ fontSize: "10px", color: c.muted }}>Active ≤7d</div>
              </div>
              <div style={{ background: c.cardBg2, borderRadius: radii.card, border: `1px solid ${c.border}`, padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "22px", fontWeight: 700, color: c.text }}>{totalSessions}</div>
                <div style={{ fontSize: "10px", color: c.muted }}>Total sessions</div>
              </div>
              <div style={{ background: c.cardBg2, borderRadius: radii.card, border: `1px solid ${c.border}`, padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "22px", fontWeight: 700, color: c.orange }}>{inactiveCount}</div>
                <div style={{ fontSize: "10px", color: c.muted }}>Needs attention</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    setMember(m);
                    setLiftKey(Object.keys(m.lifts)[0] ?? "");
                    setActivityTab(m.liftCount > 0 ? "Lifts" : m.cardioCount > 0 ? "Cardio" : "Runs");
                  }}
                  style={{
                    background: c.cardBg2,
                    border: `1px solid ${m.status === "inactive" ? `${c.red}44` : c.border}`,
                    borderRadius: radii.card, padding: "14px", cursor: "pointer", transition: "all 0.15s",
                    display: "flex", alignItems: "center", gap: "12px",
                  }}
                >
                  <Avatar name={m.name} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: c.text }}>{m.name}</div>
                      <div style={{
                        padding: "2px 8px", borderRadius: radii.pill, fontSize: "10px", fontWeight: 600,
                        background: `${c.accent}22`, color: c.accent, border: `1px solid ${c.accentBorder}`,
                      }}>
                        {m.focus}
                      </div>
                      {m.status === "inactive" && (
                        <div style={{
                          padding: "2px 8px", borderRadius: radii.pill, fontSize: "10px", fontWeight: 600,
                          background: `${c.red}22`, color: c.red, border: `1px solid ${c.red}44`,
                        }}>
                          Inactive
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: c.muted }}>
                      {m.streak}d streak · {m.workouts} sessions · {m.lastSeen}
                    </div>
                    {(m.liftCount > 0 || m.cardioCount > 0 || m.runCount > 0 || m.importedCount > 0) && (
                      <div style={{ fontSize: "11px", color: c.muted2, marginTop: "2px" }}>
                        {[
                          m.liftCount > 0 && `${m.liftCount} lifts`,
                          m.cardioCount > 0 && `${m.cardioCount} cardio`,
                          m.runCount > 0 && `${m.runCount} runs`,
                          m.importedCount > 0 && `${m.importedCount} imported`,
                        ].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} color={c.muted2} />
                </div>
              ))}

              {members.length === 0 && (
                <div style={{ textAlign: "center", padding: "48px 0", color: c.muted, fontSize: "14px" }}>
                  No member data found.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
