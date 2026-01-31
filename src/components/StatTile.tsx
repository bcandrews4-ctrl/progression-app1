import React from "react";
import { colors, radii } from "../styles/tokens";

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatTile({ label, value, sub, icon, className = "" }: StatTileProps) {
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {icon && (
        <div className="mb-2" style={{ color: colors.accent }}>
          {icon}
        </div>
      )}
      <div className="text-xs font-medium mb-1" style={{ color: colors.muted }}>
        {label}
      </div>
      <div className="text-2xl font-semibold" style={{ color: colors.text }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1 font-medium" style={{ color: colors.accent }}>
          {sub}
        </div>
      )}
    </div>
  );
}

