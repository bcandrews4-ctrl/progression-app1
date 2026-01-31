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
      className="relative rounded-2xl p-4"
      style={{
        background: colors.cardBg2,
        border: `1px solid ${colors.border}`,
        minHeight: isCompact ? "120px" : "140px",
      }}
    >
      {/* Icon - absolute positioned top-left, slightly bigger than text */}
      <div
        className="absolute"
        style={{
          top: "16px",
          left: "16px",
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
          className="text-sm font-semibold mb-3"
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: "13px",
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
            className="text-2xl font-semibold"
            style={{
              color: colors.text,
              fontSize: isCompact ? "22px" : "26px",
            }}
          >
            {value}
          </div>
          {unit && (
            <div
              className="text-xs font-medium"
              style={{ color: colors.muted }}
            >
              {unit}
            </div>
          )}
        </div>

        {/* Sub Label */}
        {subLabel && (
          <div
            className="text-xs mt-1"
            style={{ color: colors.muted }}
          >
            {subLabel}
          </div>
        )}
      </div>
    </div>
  );
}

