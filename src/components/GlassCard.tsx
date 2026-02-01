import React from "react";
import { colors, shadows } from "../styles/tokens";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glow?: boolean;
}

/**
 * Card - Standardized card component with consistent radius, padding, surface, border, and shadow.
 * Optional glow border for "highlight" cards.
 */
export function GlassCard({ children, className = "", style = {}, glow = false }: GlassCardProps) {
  return (
    <div
      className={className}
      style={{
        background: "var(--surface)",
        border: "var(--border)",
        borderRadius: "var(--card-radius)",
        padding: "var(--card-pad)",
        boxShadow: glow ? "var(--glow), var(--shadow)" : "var(--shadow)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

