import React from "react";
import { colors, radii } from "../styles/tokens";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface HealthMetricTileProps {
  title: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  subLabel?: string;
  variant?: "compact" | "full";
  sparklineData?: Array<{ value: number }>;
  showMiniChart?: boolean;
}

export function HealthMetricTile({
  title,
  value,
  unit,
  icon,
  subLabel,
  variant = "full",
  sparklineData,
  showMiniChart = false,
}: HealthMetricTileProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className="relative"
      style={{
        background: "var(--surface)",
        border: "var(--border)",
        borderRadius: "var(--card-radius)",
        padding: "var(--card-pad)",
        boxShadow: "var(--shadow)",
        minHeight: isCompact ? "120px" : "140px",
      }}
    >
      {/* Icon - absolute positioned top-left, slightly bigger than text */}
      <div
        className="absolute"
        style={{
          top: "var(--card-pad)",
          left: "var(--card-pad)",
          width: "16px",
          height: "16px",
          opacity: 0.95,
          color: colors.accent,
        }}
      >
        {icon}
      </div>

      {/* Content - padded to avoid icon overlap */}
      <div className="pt-10 flex flex-col h-full">
        {/* Title - with spacing from icon */}
        <div
          style={{
            fontSize: "12.5px",
            fontWeight: 600,
            color: "var(--muted)",
            marginBottom: "12px",
            paddingLeft: "24px", // Spacing between icon and title
          }}
        >
          {title}
        </div>

        {/* Mini Chart Area (for Sleep) */}
        {showMiniChart && sparklineData && sparklineData.length > 0 ? (
          <div className="h-14 mb-2 flex items-end justify-center gap-0.5">
            {sparklineData.map((item, idx) => {
              const maxValue = Math.max(...sparklineData.map(d => d.value));
              const height = Math.max((item.value / maxValue) * 100, 15);
              return (
                <div
                  key={idx}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${Math.min(height, 100)}%`,
                    background: colors.accent,
                    minHeight: "4px",
                    filter: `drop-shadow(0 0 10px rgba(0,0,255,0.25))`,
                  }}
                />
              );
            })}
          </div>
        ) : showMiniChart && (!sparklineData || sparklineData.length === 0) ? (
          <div
            className="h-14 mb-2 flex items-center justify-center text-xs"
            style={{ color: colors.muted }}
          >
            No sleep data yet
          </div>
        ) : null}

        {/* Value and Unit */}
        <div className="mt-auto flex items-baseline gap-1">
          <div
            style={{
              fontSize: isCompact ? "28px" : "32px",
              fontWeight: 700,
              lineHeight: "1.2",
              color: colors.text,
            }}
          >
            {value}
          </div>
          {unit && (
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: 400,
                color: "var(--muted)",
              }}
            >
              {unit}
            </div>
          )}
        </div>

        {/* Sub Label */}
        {subLabel && (
          <div
            style={{
              fontSize: "12.5px",
              fontWeight: 400,
              color: "var(--muted)",
              marginTop: "4px",
            }}
          >
            {subLabel}
          </div>
        )}
      </div>
    </div>
  );
}

