import React from "react";
import { useTheme } from "../hooks/useTheme";

interface StreakCardProps {
  days?: string[];
  completedDays?: boolean[];
  todayIndex?: number;
  streakCount?: number;
  streakLabel?: string;
  streakSub?: string;
}

export function StreakCard({
  days = ["M", "T", "W", "T", "F", "S", "S"],
  completedDays,
  todayIndex = 0,
  streakCount = 0,
  streakLabel,
  streakSub = "Keep it up.",
}: StreakCardProps) {
  const { c } = useTheme();
  const label = streakLabel ?? (streakCount > 0 ? `${streakCount} day streak` : "No streak yet");

  return (
    <div
      style={{
        background: c.cardBg2,
        border: `1px solid ${c.border}`,
        borderRadius: "16px",
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "15px", fontWeight: 700, color: c.text }}>Streak</div>
        <div style={{ fontSize: "11px", color: c.orange }}>{label}</div>
      </div>
      <div style={{ fontSize: "11px", color: c.muted, marginTop: "2px" }}>{streakSub}</div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
        {days.map((day, idx) => {
          const done = completedDays ? completedDays[idx] === true : false;
          const today = idx === todayIndex;
          return (
            <div key={`${day}-${idx}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: done ? c.accent : "rgba(255,255,255,0.05)",
                  border: today ? `1.5px solid ${c.accent}` : done ? "none" : `1px solid ${c.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <polyline points="20 6 9 17 4 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </div>
              <div style={{ fontSize: "9px", color: today ? c.accent : done ? c.muted : c.muted2 }}>{day}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
