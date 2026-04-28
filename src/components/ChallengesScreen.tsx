import React, { useState } from "react";
import { radii } from "../styles/tokens";
import { useTheme } from "../hooks/useTheme";
import { ChevronLeft, Flame, Activity, Dumbbell } from "lucide-react";

interface BoardEntry {
  rank: number;
  name: string;
  value: string;
  you: boolean;
}

interface Challenge {
  id: number;
  title: string;
  period: string;
  desc: string;
  unit: string;
  icon: string;
  board: BoardEntry[];
}

const CHALLENGES: Challenge[] = [
  {
    id: 1, title: "Volume King", period: "This week",
    desc: "Most total kg lifted across all sessions",
    unit: "kg", icon: "dumbbell",
    board: [
      { rank: 1, name: "Jordan K.", value: "18,420", you: false },
      { rank: 2, name: "Alex M.",   value: "14,680", you: true  },
      { rank: 3, name: "Sam R.",    value: "12,900", you: false },
      { rank: 4, name: "Maya T.",   value: "11,250", you: false },
      { rank: 5, name: "Chris B.",  value: "9,800",  you: false },
    ],
  },
  {
    id: 2, title: "Streak Warrior", period: "Apr 2025",
    desc: "Longest active training streak this month",
    unit: "days", icon: "flame",
    board: [
      { rank: 1, name: "Maya T.",   value: "18", you: false },
      { rank: 2, name: "Alex M.",   value: "12", you: true  },
      { rank: 3, name: "Pat L.",    value: "11", you: false },
      { rank: 4, name: "Sam R.",    value: "9",  you: false },
      { rank: 5, name: "Jordan K.", value: "7",  you: false },
    ],
  },
  {
    id: 3, title: "Cardio Destroyer", period: "This week",
    desc: "Highest single effort calorie burn (60s)",
    unit: "cal", icon: "activity",
    board: [
      { rank: 1, name: "Chris B.", value: "24", you: false },
      { rank: 2, name: "Sam R.",   value: "21", you: false },
      { rank: 3, name: "Alex M.",  value: "20", you: true  },
      { rank: 4, name: "Jordan K.", value: "19", you: false },
      { rank: 5, name: "Pat L.",   value: "17", you: false },
    ],
  },
];

function ChallengeIcon({ name, size, color }: { name: string; size: number; color: string }) {
  const props = { size, color, strokeWidth: 1.8 };
  switch (name) {
    case "flame":    return <Flame {...props} />;
    case "activity": return <Activity {...props} />;
    default:         return <Dumbbell {...props} />;
  }
}

const RANK_COLORS = ["rgba(255,215,0,0.15)", "rgba(192,192,192,0.15)", "rgba(205,127,50,0.15)"];
const RANK_BORDER = ["rgba(255,215,0,0.4)", "rgba(192,192,192,0.4)", "rgba(205,127,50,0.4)"];
const RANK_TEXT   = ["#FFD700", "#C0C0C0", "#CD7F32"];

interface ChallengesScreenProps {
  onClose: () => void;
}

export function ChallengesScreen({ onClose }: ChallengesScreenProps) {
  const { c } = useTheme();
  const [active, setActive] = useState<Challenge>(CHALLENGES[0]);
  const [joined, setJoined] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: false });

  const you = active.board.find((b) => b.you);

  return (
    <div style={{ minHeight: "100%", background: c.bg, overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px", borderBottom: `1px solid ${c.border}` }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px" }}>
          <ChevronLeft size={22} color={c.muted} />
        </button>
        <div style={{ fontSize: "18px", fontWeight: 700, color: c.text }}>Gym Challenges</div>
        <div style={{
          marginLeft: "auto", padding: "4px 10px", borderRadius: radii.pill, fontSize: "11px", fontWeight: 600,
          background: `${c.green}22`, color: c.green, border: `1px solid ${c.green}44`,
        }}>
          Live
        </div>
      </div>

      <div style={{ padding: "16px 16px 32px" }}>
        {/* Challenge picker */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", marginBottom: "16px", scrollbarWidth: "none" }}>
          {CHALLENGES.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActive(ch)}
              style={{
                flexShrink: 0, padding: "10px 14px", borderRadius: radii.pill, fontSize: "13px", fontWeight: 500,
                background: active.id === ch.id ? c.accent : c.cardBg2,
                border: `1px solid ${active.id === ch.id ? c.accent : c.border}`,
                color: active.id === ch.id ? "#fff" : c.muted,
                cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontFamily: "inherit",
              }}
            >
              <ChallengeIcon name={ch.icon} size={14} color={active.id === ch.id ? "#fff" : c.muted} />
              {ch.title}
            </button>
          ))}
        </div>

        {/* Active challenge card */}
        <div style={{
          background: c.cardBg2, border: `1px solid ${c.accentBorder}`,
          borderRadius: radii.card, padding: "16px", marginBottom: "16px",
          boxShadow: `0 0 24px ${c.accentGlow}`,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: c.text }}>{active.title}</div>
              <div style={{ fontSize: "12px", color: c.muted, marginTop: "2px" }}>{active.desc}</div>
            </div>
            <div style={{
              padding: "4px 10px", borderRadius: radii.pill, fontSize: "11px", fontWeight: 600,
              background: `${c.accent}22`, color: c.accent, border: `1px solid ${c.accentBorder}`,
              flexShrink: 0,
            }}>
              {active.period}
            </div>
          </div>

          {/* Your rank */}
          {you && (
            <div style={{
              display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
              background: c.accentSoft, border: `1px solid ${c.accentBorder}`, borderRadius: "10px",
              marginBottom: "12px",
            }}>
              <div style={{ fontSize: "22px", fontWeight: 700, color: c.accent }}>#{you.rank}</div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: c.text }}>Your current rank</div>
                <div style={{ fontSize: "12px", color: c.muted }}>{you.value} {active.unit}</div>
              </div>
              {you.rank > 1 && (
                <div style={{ marginLeft: "auto", fontSize: "12px", color: c.muted, textAlign: "right" }}>
                  {(parseInt(active.board[you.rank - 2].value.replace(",", "")) - parseInt(you.value.replace(",", ""))).toLocaleString()} {active.unit} to #{you.rank - 1}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setJoined((j) => ({ ...j, [active.id]: !j[active.id] }))}
            style={{
              width: "100%", height: "40px", borderRadius: radii.pill, fontSize: "13px", fontWeight: 600,
              background: joined[active.id] ? "transparent" : c.accent,
              color: joined[active.id] ? c.muted : "#fff",
              border: joined[active.id] ? `1px solid ${c.borderMid}` : "none",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {joined[active.id] ? "✓ Joined" : "Join challenge"}
          </button>
        </div>

        {/* Leaderboard */}
        <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: c.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
            Leaderboard
          </div>
          {active.board.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: "12px", padding: "10px",
                marginBottom: "6px", borderRadius: "10px",
                background: entry.you ? c.accentSoft : "rgba(255,255,255,0.02)",
                border: `1px solid ${entry.you ? c.accentBorder : c.border}`,
              }}
            >
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                background: entry.rank <= 3 ? RANK_COLORS[entry.rank - 1] : "rgba(255,255,255,0.05)",
                border: `1px solid ${entry.rank <= 3 ? RANK_BORDER[entry.rank - 1] : c.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: 700,
                color: entry.rank <= 3 ? RANK_TEXT[entry.rank - 1] : c.muted,
              }}>
                {entry.rank}
              </div>
              <div style={{
                width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                background: c.accentSoft, border: `1px solid ${c.accentBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: 700, color: c.accent,
              }}>
                {entry.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "14px", fontWeight: entry.you ? 700 : 500, color: c.text }}>
                  {entry.name}
                </span>
                {entry.you && <span style={{ fontSize: "11px", color: c.accent, marginLeft: "6px" }}>you</span>}
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: entry.you ? c.accent : c.text }}>
                {entry.value}{" "}
                <span style={{ fontSize: "11px", fontWeight: 400, color: c.muted }}>{active.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
