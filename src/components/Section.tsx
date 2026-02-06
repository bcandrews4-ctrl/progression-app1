import React from "react";
import { colors } from "../styles/tokens";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  gap?: string;
}

/**
 * Section - Handles consistent vertical spacing between groups.
 */
export function Section({ children, className = "", title, gap = "var(--section-gap)" }: SectionProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: gap,
      }}
    >
      {title && (
        <div
          style={{
            fontSize: "15px",
            fontWeight: 600,
            color: colors.muted,
            marginBottom: "4px",
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
