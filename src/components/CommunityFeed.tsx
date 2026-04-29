import React from "react";
import { useTheme } from "../hooks/useTheme";

export function CommunityFeed() {
  const { c } = useTheme();

  const items = [
    { name: "Alex", action: "hit a new PR on Back Squat", right: "160kg", time: "3m" },
    { name: "Sofia", action: "finished 4 running sessions this week", right: "4x", time: "12m" },
  ];

  return (
    <div
      style={{
        background: c.cardBg2,
        border: `1px solid ${c.border}`,
        borderRadius: "16px",
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 600, color: c.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
        Community
      </div>

      {items.map((item, idx) => (
        <div
          key={item.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 0",
            borderBottom: idx < items.length - 1 ? `1px solid ${c.border}` : "none",
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: c.accentSoft, border: `1px solid ${c.accentBorder}` }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: c.text }}>{item.name} </span>
            <span style={{ fontSize: "13px", color: c.muted }}>{item.action}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
            <div style={{ fontSize: "10px", color: c.muted2 }}>{item.time}</div>
            <div style={{ fontSize: "10px", color: c.accent, fontWeight: 600 }}>{item.right}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
