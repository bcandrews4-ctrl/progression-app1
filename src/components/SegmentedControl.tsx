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
      className={`flex items-center ${className}`}
      style={{
        background: "rgba(255,255,255,0.05)",
        borderRadius: "var(--chip-radius)",
        padding: "6px",
        border: "1px solid rgba(255,255,255,0.08)",
        gap: "0",
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => setValue(o.value)}
            className="text-sm font-medium transition-all duration-200"
            style={{
              background: active ? colors.accent : "transparent",
              color: active ? colors.text : "rgba(255,255,255,0.75)",
              borderRadius: "var(--chip-radius)",
              boxShadow: active ? shadows.glow : "none",
              padding: "12px 14px",
              flex: 1,
              minWidth: 0,
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = "transparent";
              }
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

