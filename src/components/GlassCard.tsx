import React from "react";
import { colors, radii, shadows } from "../styles/tokens";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glow?: boolean;
}

export function GlassCard({ children, className = "", style = {}, glow = false }: GlassCardProps) {
  return (
    <div
      className={`${className}`}
      style={{
        background: colors.cardBg2,
        border: `1px solid ${colors.border}`,
        borderRadius: radii["2xl"],
        padding: "20px",
        boxShadow: glow ? shadows.glow : shadows.soft,
        ...(glow && {
          boxShadow: `${shadows.glow}, ${shadows.glowInner}`,
        }),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

