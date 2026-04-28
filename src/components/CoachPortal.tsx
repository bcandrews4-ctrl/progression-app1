import React, { useState } from "react";
import { radii } from "../styles/tokens";
import { useTheme } from "../hooks/useTheme";
import { AreaChart } from "./AreaChart";
import { ChevronLeft, ChevronRight, Users, Delete } from "lucide-react";

interface LiftSeries {
  label: string;
  value: number;
}

interface Member {
  id: number;
  name: string;
  focus: string;
  streak: number;
  workouts: number;
  lastSeen: string;
  status: "active" | "inactive";
  lifts: Record<string, LiftSeries[]>;
  insight: string;
}

const MEMBERS: Member[] = [
  {
    id: 1, name: "Jordan K.", focus: "Strength", streak: 7, workouts: 24,
    lastSeen: "2 hrs ago", status: "active",
    lifts: {
      "Back Squat":  [{ label: "Jan", value: 120 }, { label: "Feb", value: 125 }, { label: "Mar", value: 130 }, { label: "Apr", value: 135 }],
      "Deadlift":    [{ label: "Jan", value: 180 }, { label: "Feb", value: 185 }, { label: "Mar", value: 192 }, { label: "Apr", value: 197 }],
      "Bench Press": [{ label: "Jan", value: 95  }, { label: "Feb", value: 100 }, { label: "Mar", value: 102 }, { label: "Apr", value: 105 }],
    },
    insight: "Deadlift progression is excellent (+17kg in 4 months). Bench is lagging — consider adding a second pressing day.",
  },
  {
    id: 2, name: "Maya T.", focus: "Hypertrophy", streak: 18, workouts: 31,
    lastSeen: "30 min ago", status: "active",
    lifts: {
      "Back Squat":  [{ label: "Jan", value: 85  }, { label: "Feb", value: 90  }, { label: "Mar", value: 95  }, { label: "Apr", value: 100 }],
      "Deadlift":    [{ label: "Jan", value: 110 }, { label: "Feb", value: 118 }, { label: "Mar", value: 122 }, { label: "Apr", value: 127 }],
      "Bench Press": [{ label: "Jan", value: 62  }, { label: "Feb", value: 65  }, { label: "Mar", value: 68  }, { label: "Apr", value: 72  }],
    },
    insight: "Best streak on record — 18 days. Volume increasing well across all lifts. Monitor recovery; consider a deload next week.",
  },
  {
    id: 3, name: "Sam R.", focus: "Hybrid", streak: 9, workouts: 19,
    lastSeen: "Yesterday", status: "active",
    lifts: {
      "Back Squat":  [{ label: "Jan", value: 100 }, { label: "Feb", value: 102 }, { label: "Mar", value: 105 }, { label: "Apr", value: 108 }],
      "Deadlift":    [{ label: "Jan", value: 140 }, { label: "Feb", value: 145 }, { label: "Mar", value: 148 }, { label: "Apr", value: 152 }],
      "Bench Press": [{ label: "Jan", value: 80  }, { label: "Feb", value: 82  }, { label: "Mar", value: 85  }, { label: "Apr", value: 87  }],
    },
    insight: "Consistent progress across all three. Running data from Strava shows improving 5km pace. Good hybrid balance.",
  },
  {
    id: 4, name: "Chris B.", focus: "Strength", streak: 3, workouts: 12,
    lastSeen: "3 days ago", status: "inactive",
    lifts: {
      "Back Squat":  [{ label: "Jan", value: 115 }, { label: "Feb", value: 118 }, { label: "Mar", value: 118 }, { label: "Apr", value: 120 }],
      "Deadlift":    [{ label: "Jan", value: 160 }, { label: "Feb", value: 162 }, { label: "Mar", value: 160 }, { label: "Apr", value: 163 }],
      "Bench Press": [{ label: "Jan", value: 100 }, { label: "Feb", value: 100 }, { label: "Mar", value: 102 }, { label: "Apr", value: 102 }],
    },
    insight: "Progress has plateaued on squat and bench for 6 weeks. Recommend a deload + reassess program structure. Attendance dropping.",
  },
  {
    id: 5, name: "Pat L.", focus: "Hypertrophy", streak: 11, workouts: 22,
    lastSeen: "1 hr ago", status: "active",
    lifts: {
      "Back Squat":  [{ label: "Jan", value: 90  }, { label: "Feb", value: 95  }, { label: "Mar", value: 100 }, { label: "Apr", value: 105 }],
      "Deadlift":    [{ label: "Jan", value: 125 }, { label: "Feb", value: 132 }, { label: "Mar", value: 138 }, { label: "Apr", value: 143 }],
      "Bench Press": [{ label: "Jan", value: 75  }, { label: "Feb", value: 78  }, { label: "Mar", value: 82  }, { label: "Apr", value: 86  }],
    },
    insight: "Strong linear progression on all three lifts. Deadlift +18kg in 4 months is above average. Hypertrophy focus is showing.",
  },
];

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

interface CoachPortalProps {
  onExit: () => void;
}

export function CoachPortal({ onExit }: CoachPortalProps) {
  const { c } = useTheme();
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [liftKey, setLiftKey] = useState("Back Squat");

  const tryLogin = () => {
    if (pin === "1234") { setAuthed(true); setErr(false); }
    else { setErr(true); setPin(""); }
  };

  // PIN screen
  if (!authed) {
    return (
      <div style={{
        minHeight: "100%", background: c.bg, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "32px 24px",
      }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "18px", margin: "0 auto 16px",
            background: c.accentSoft, border: `1px solid ${c.accentBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Users size={30} color={c.accent} />
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: c.text, marginBottom: "6px" }}>Coach Portal</div>
          <div style={{ fontSize: "14px", color: c.muted }}>Enter your master PIN to access member data</div>
        </div>

        {/* PIN dots */}
        <div style={{ display: "flex", gap: "14px", marginBottom: "28px" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{
              width: "18px", height: "18px", borderRadius: "50%",
              background: pin.length > i ? c.accent : c.border,
              border: `2px solid ${pin.length > i ? c.accent : c.border}`,
              transition: "all 0.15s",
            }} />
          ))}
        </div>

        {err && <div style={{ fontSize: "13px", color: c.red, marginBottom: "16px" }}>Incorrect PIN. Try again.</div>}

        {/* Keypad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", width: "240px", marginBottom: "24px" }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "del"].map((k, i) => (
            <button
              key={i}
              onClick={() => {
                if (k === "del") setPin((p) => p.slice(0, -1));
                else if (k !== "" && pin.length < 4) { const next = pin + String(k); setPin(next); if (next.length === 4) setTimeout(() => { if (next === "1234") { setAuthed(true); setErr(false); } else { setErr(true); setPin(""); } }, 200); }
              }}
              style={{
                height: "56px", borderRadius: "12px", fontSize: k === "del" ? "14px" : "20px", fontWeight: 600,
                background: k === "" ? "transparent" : c.cardBg2,
                border: k === "" ? "none" : `1px solid ${c.border}`,
                color: c.text, cursor: k === "" ? "default" : "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {k === "del" ? <Delete size={18} color={c.muted} /> : k}
            </button>
          ))}
        </div>

        <button
          onClick={tryLogin}
          disabled={pin.length < 4}
          style={{
            width: "100%", maxWidth: "240px", height: "52px", borderRadius: radii.pill,
            background: pin.length === 4 ? c.accent : c.cardBg2,
            color: pin.length === 4 ? "#fff" : c.muted,
            border: "none", fontSize: "16px", fontWeight: 600, cursor: pin.length === 4 ? "pointer" : "not-allowed",
            fontFamily: "inherit",
          }}
        >
          Unlock
        </button>
        <button
          onClick={onExit}
          style={{ marginTop: "16px", background: "none", border: "none", color: c.muted, fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}
        >
          Back to app
        </button>
        <div style={{ marginTop: "20px", fontSize: "11px", color: c.muted2 }}>Demo PIN: 1234</div>
      </div>
    );
  }

  // Member detail
  if (member) {
    const liftData = member.lifts[liftKey];
    const vals = liftData.map((d) => d.value);
    const changePct = (((vals[vals.length - 1] - vals[0]) / vals[0]) * 100).toFixed(1);
    const changeNum = parseFloat(changePct);

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
          {/* Key stats */}
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

          {/* Lift chart */}
          <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "14px 12px 10px", marginBottom: "14px" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px", overflowX: "auto" }}>
              {Object.keys(member.lifts).map((k) => (
                <button
                  key={k}
                  onClick={() => setLiftKey(k)}
                  style={{
                    flexShrink: 0, padding: "6px 12px", borderRadius: radii.pill, fontSize: "12px", fontWeight: 500,
                    background: liftKey === k ? c.accent : "rgba(255,255,255,0.05)",
                    border: `1px solid ${liftKey === k ? c.accent : c.border}`,
                    color: liftKey === k ? "#fff" : c.muted, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
            <div style={{ fontSize: "12px", color: c.muted, marginBottom: "6px" }}>
              e1RM — {liftKey}{" "}
              <span style={{ color: changeNum >= 0 ? c.green : c.red, fontWeight: 600 }}>
                {changeNum >= 0 ? "+" : ""}{changePct}% (4 months)
              </span>
            </div>
            <AreaChart data={liftData} height={120} />
          </div>

          {/* Coach insight */}
          <div style={{ background: c.accentSoft, border: `1px solid ${c.accentBorder}`, borderRadius: radii.card, padding: "14px 16px", marginBottom: "14px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: c.accent, marginBottom: "6px" }}>Coach AI Insight</div>
            <div style={{ fontSize: "13px", color: c.muted, lineHeight: 1.6 }}>{member.insight}</div>
          </div>

          {/* All lifts */}
          <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "14px 16px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: c.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
              All lifts — latest
            </div>
            {Object.entries(member.lifts).map(([lift, data], i, arr) => {
              const latest = data[data.length - 1].value;
              const prev = data[0].value;
              const pct = (((latest - prev) / prev) * 100).toFixed(1);
              return (
                <div key={lift} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${c.border}` : "none",
                }}>
                  <div style={{ fontSize: "14px", color: c.text, fontWeight: 500 }}>{lift}</div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: c.text }}>{latest}kg</div>
                    <div style={{
                      padding: "2px 8px", borderRadius: radii.pill, fontSize: "11px", fontWeight: 600,
                      background: `${c.green}22`, color: c.green, border: `1px solid ${c.green}44`,
                    }}>
                      +{pct}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Member list
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
          {MEMBERS.length} members
        </div>
      </div>

      <div style={{ padding: "16px 16px 40px" }}>
        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
          <div style={{ background: c.cardBg2, borderRadius: radii.card, border: `1px solid ${c.border}`, padding: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: 700, color: c.green }}>4</div>
            <div style={{ fontSize: "10px", color: c.muted }}>Active today</div>
          </div>
          <div style={{ background: c.cardBg2, borderRadius: radii.card, border: `1px solid ${c.border}`, padding: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: 700, color: c.text }}>108</div>
            <div style={{ fontSize: "10px", color: c.muted }}>Total sessions</div>
          </div>
          <div style={{ background: c.cardBg2, borderRadius: radii.card, border: `1px solid ${c.border}`, padding: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "22px", fontWeight: 700, color: c.orange }}>1</div>
            <div style={{ fontSize: "10px", color: c.muted }}>Needs attention</div>
          </div>
        </div>

        {/* Member cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {MEMBERS.map((m) => (
            <div
              key={m.id}
              onClick={() => { setMember(m); setLiftKey("Back Squat"); }}
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
        </div>
      </div>
    </div>
  );
}
