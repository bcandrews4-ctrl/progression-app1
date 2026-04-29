import React, { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { BottomSheet } from "./BottomSheet";
import { radii } from "../styles/tokens";

interface ReadinessCardProps {
  score: number;
  sleepHours: number;
  hrv: number;
  restingHr: number;
  weeklyVolumeTons: number;
}

export function ReadinessCard({
  score,
  sleepHours,
  hrv,
  restingHr,
  weeklyVolumeTons,
}: ReadinessCardProps) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);

  const color = score >= 80 ? c.green : score >= 60 ? c.accent : c.orange;
  const label = score >= 80 ? "Go hard" : score >= 60 ? "Moderate" : "Take it easy";

  const radius = 21;
  const circumference = 2 * Math.PI * radius;

  const metrics = [
    { label: "Sleep", value: `${sleepHours.toFixed(1)}h`, score: Math.min(100, (sleepHours / 9) * 100), color: c.accent },
    { label: "HRV", value: `${hrv}ms`, score: Math.min(100, (hrv / 70) * 100), color: c.green },
    { label: "Resting HR", value: `${restingHr}bpm`, score: Math.max(0, 100 - (restingHr - 50) * 3), color: c.green },
    { label: "Weekly vol", value: `${weeklyVolumeTons.toFixed(1)}t`, score: Math.min(100, (weeklyVolumeTons / 20) * 100), color: c.orange },
  ];

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          padding: "14px 16px",
          marginBottom: "12px",
          borderRadius: radii.card,
          cursor: "pointer",
          background: c.cardBg2,
          border: `1px solid ${color}44`,
          boxShadow: `0 0 16px ${color}18`,
          transition: "transform 0.15s",
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = "scale(0.985)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <svg width="52" height="52" viewBox="0 0 52 52" style={{ flexShrink: 0 }}>
          <circle cx="26" cy="26" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - score / 100)}
            strokeLinecap="round"
            transform="rotate(-90 26 26)"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
          <text x="26" y="31" textAnchor="middle" fontSize="13" fontWeight="700" fill={c.text} fontFamily="inherit">
            {score}
          </text>
        </svg>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: c.text }}>Readiness: {label}</div>
          <div style={{ fontSize: "12px", color: c.muted, marginTop: "2px" }}>
            Sleep {sleepHours.toFixed(1)}h · HRV {hrv}ms · Volume moderate
          </div>
        </div>
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Daily Readiness">
        <div style={{ paddingBottom: "8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            {metrics.map((m) => (
              <div key={m.label} style={{ background: c.cardBg2, borderRadius: "12px", border: `1px solid ${c.border}`, padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div style={{ fontSize: "11px", color: c.muted }}>{m.label}</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: c.text }}>{m.value}</div>
                </div>
                <div style={{ height: "4px", borderRadius: "2px", background: c.border, overflow: "hidden", marginBottom: "4px" }}>
                  <div style={{ width: `${m.score}%`, height: "100%", background: m.color, borderRadius: "2px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
