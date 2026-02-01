import React from "react";
import { colors } from "../styles/tokens";

interface MetricCardHeaderProps {
  icon: React.ReactNode;
  title: string;
}

/**
 * MetricCardHeader - Shared header layout for all metric cards.
 * Ensures consistent alignment: flex row, 40px height, 28x28 icon, 10px gap, baseline alignment.
 */
export function MetricCardHeader({ icon, title }: MetricCardHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        height: "40px",
        gap: "10px",
      }}
    >
      {/* Icon container - fixed 24x24 on mobile, 28x28 on larger screens */}
      <div
        className="w-6 h-6 sm:w-7 sm:h-7"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.accent,
          opacity: 0.95,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      {/* Title text - baseline aligned with icon */}
      <div
        style={{
          fontSize: "9px",
          fontWeight: 500,
          color: colors.muted,
          lineHeight: "1",
          display: "flex",
          alignItems: "baseline",
        }}
      >
        {title}
      </div>
    </div>
  );
}
