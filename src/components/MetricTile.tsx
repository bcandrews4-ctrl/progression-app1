import React from "react";
import { colors } from "../styles/tokens";

interface MetricTileProps {
  title: string;
  value: string;
  sublabel?: string;
  icon?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * MetricTile - Standard format for metric cards (title + value + optional sublabel + optional icon).
 * Consistent spacing so nothing is stuck to the edge (min 16px inner padding).
 */
export function MetricTile({
  title,
  value,
  sublabel,
  icon,
  className = "",
  style = {},
}: MetricTileProps) {
  return (
    <div
      className={className}
      style={{
        background: "var(--surface)",
        border: "var(--border)",
        borderRadius: "var(--card-radius)",
        padding: "var(--card-pad)",
        boxShadow: "var(--shadow)",
        ...style,
      }}
    >
      {icon && (
        <div
          style={{
            marginBottom: "12px",
            color: colors.accent,
            display: "flex",
            alignItems: "center",
          }}
        >
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
        {title}
      </div>
      <div
        style={{
          fontSize: "32px",
          fontWeight: 700,
          lineHeight: "1.2",
          color: colors.text,
          marginBottom: sublabel ? "4px" : "0",
        }}
      >
        {value}
      </div>
      {sublabel && (
        <div
          style={{
            fontSize: "12.5px",
            fontWeight: 400,
            color: "var(--muted)",
            marginTop: "4px",
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  );
}
