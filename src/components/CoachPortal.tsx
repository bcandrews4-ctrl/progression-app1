import React, { useState, useEffect } from "react";
import { radii } from "../styles/tokens";
import { useTheme } from "../hooks/useTheme";
import { AreaChart } from "./AreaChart";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { fetchAdminDashboardData, AdminMemberSummary, AdminMemberData, LiftEntry } from "../lib/db";

interface LiftSeries {
  label: string;
  value: number;
}

interface Member {
  id: string;
  name: string;
  email: string | null;
  focus: string;
  streak: number;
  workouts: number;
  lastSeen: string;
  status: "active" | "inactive";
  lifts: Record<string, LiftSeries[]>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  // Keep top 3 by number of months logged
  return Object.fromEntries(
    Object.entries(result)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 3)
  );
}

function buildMember(summary: AdminMemberSummary, data: AdminMemberData): Member {
  const allDates = [
    ...data.lifts.map((l) => l.dateISO),
    ...data.runs.map((r) => r.dateISO),
    ...data.cardio.map((c) => c.dateISO),
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
    lastSeen: formatLastSeen(lastDate),
    status: diffDays <= 7 ? "active" : "inactive",
    lifts: buildLiftSeries(data.lifts),
  };
}

// ── Avatar ───────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (!isAdmin) return;
    fetchAdminDashboardData(userId, "All-time")
      .then(({ members: summaries, memberData }) => {
        const built = summaries
          .map((s) => buildMember(s, memberData[s.userId] ?? { lifts: [], cardio: [], runs: [] }))
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

  // Member detail view
  if (member) {
    const liftKeys = Object.keys(member.lifts);
    const activeLiftKey = liftKeys.includes(liftKey) ? liftKey : liftKeys[0] ?? "";
    const liftData = activeLiftKey ? member.lifts[activeLiftKey] : [];
    const vals = liftData.map((d) => d.value);
    const changePct = vals.length >= 2
      ? (((vals[vals.length - 1] - vals[0]) / vals[0]) * 100).toFixed(1)
      : null;

    return (
      <div style={{ minHeight: "100%", background: c.bg, overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px", borderBottom: `1px solid ${c.border}` }}>
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

        <div style={{ padding: "16px 16px 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
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

          {liftKeys.length > 0 && (
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
          )}

          {liftKeys.length > 0 && (
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
          )}

          {liftKeys.length === 0 && (
            <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "24px", textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: c.muted }}>No lift data recorded yet.</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Member list view
  const activeCount = members.filter((m) => m.status === "active").length;
  const inactiveCount = members.filter((m) => m.status === "inactive").length;
  const totalSessions = members.reduce((sum, m) => sum + m.workouts, 0);

  return (
    <div style={{ minHeight: "100%", background: c.bg, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px", borderBottom: `1px solid ${c.border}` }}>
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

      <div style={{ padding: "16px 16px 40px" }}>
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
                  onClick={() => { setMember(m); setLiftKey(Object.keys(m.lifts)[0] ?? ""); }}
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
