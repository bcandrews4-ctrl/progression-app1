import React from "react";
import { colors } from "../styles/tokens";

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * StatTile - Standardized stat tile using design system tokens.
 * Ensures consistent padding (16px), radius (22px), and spacing.
 */
export function StatTile({ label, value, sub, icon, className = "" }: StatTileProps) {
  return (
    <div
      className={className}
      style={{
        background: "var(--surface)",
        border: "var(--border)",
        borderRadius: "var(--card-radius)",
        padding: "var(--card-pad)",
        boxShadow: "var(--shadow)",
      }}
    >
      {icon && (
        <div style={{ marginBottom: "12px", color: colors.accent }}>
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: "12.5px",
          fontWeight: 400,
          color: "var(--muted)",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "32px",
          fontWeight: 700,
          lineHeight: "1.2",
          color: colors.text,
          marginBottom: sub ? "4px" : "0",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "12.5px",
            fontWeight: 400,
            color: colors.accent,
            marginTop: "4px",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

