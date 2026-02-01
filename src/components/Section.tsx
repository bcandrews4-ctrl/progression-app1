import React from "react";

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
            color: "rgba(255,255,255,0.65)",
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
