import React from "react";
import { colors } from "../styles/tokens";

interface CardHeaderProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * CardHeader - Title left, optional action button right.
 * Ensures title is never flush to card edge (uses card padding).
 */
export function CardHeader({ title, action, className = "" }: CardHeaderProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: colors.text,
        }}
      >
        {title}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
