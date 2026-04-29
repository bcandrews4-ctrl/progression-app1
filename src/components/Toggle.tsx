import React from "react";
import { useTheme } from "../hooks/useTheme";

interface ToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
}

export function Toggle({ on, onChange }: ToggleProps) {
  const { c } = useTheme();
  return (
    <div
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: "44px",
        height: "24px",
        borderRadius: "12px",
        cursor: "pointer",
        background: on ? c.accent : c.cardBg2,
        border: `1px solid ${on ? c.accent : c.border}`,
        position: "relative",
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "2px",
          left: on ? "22px" : "2px",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </div>
  );
}
