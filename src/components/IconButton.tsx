import React from "react";
import { colors, radii, shadows } from "../styles/tokens";

interface IconButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function IconButton({ children, onClick, className = "", size = "md" }: IconButtonProps) {
  const sizeMap = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  return (
    <button
      onClick={onClick}
      className={`${sizeMap[size]} rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 ${className}`}
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = shadows.glow;
        e.currentTarget.style.borderColor = colors.accentBorder;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = colors.border;
      }}
    >
      {children}
    </button>
  );
}

