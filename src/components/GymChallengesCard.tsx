import React from "react";
import { ChevronRight, Trophy } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

interface GymChallengesCardProps {
  rankText: string;
  detailText: string;
  onClick?: () => void;
}

export function GymChallengesCard({ rankText, detailText, onClick }: GymChallengesCardProps) {
  const { c } = useTheme();

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px",
        borderRadius: "16px",
        background: c.accentSoft,
        border: `1px solid ${c.accentBorder}`,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          background: `${c.accent}22`,
          border: `1px solid ${c.accentBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Trophy size={18} color={c.accent} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: c.text }}>{rankText}</div>
        <div style={{ fontSize: "12px", color: c.muted }}>{detailText}</div>
      </div>
      <ChevronRight size={16} color={c.muted2} />
    </div>
  );
}
