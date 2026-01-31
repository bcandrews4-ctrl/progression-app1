import React from "react";
import { colors, radii, shadows } from "../styles/tokens";

interface SegmentedControlProps<T extends string> {
  value: T;
  setValue: (v: T) => void;
  options: Array<{ label: string; value: T }>;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  setValue,
  options,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      style={{
        background: colors.cardBg,
        borderRadius: radii.xl,
        padding: "4px",
        border: `1px solid ${colors.border}`,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => setValue(o.value)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
            style={
              active
                ? {
                    background: colors.accent,
                    color: colors.text,
                    boxShadow: shadows.glow,
                  }
                : {
                    background: "transparent",
                    color: colors.muted,
                  }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

