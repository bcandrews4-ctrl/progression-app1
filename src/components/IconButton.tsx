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
    sm: { width: "44px", height: "44px", iconSize: "18px" },
    md: { width: "44px", height: "44px", iconSize: "20px" },
    lg: { width: "44px", height: "44px", iconSize: "22px" },
  };

  const sizeConfig = sizeMap[size];

  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center transition-all duration-200 active:scale-95 ${className}`}
      style={{
        width: sizeConfig.width,
        height: sizeConfig.height,
        minWidth: sizeConfig.width,
        minHeight: sizeConfig.height,
        background: "var(--surface)",
        border: "var(--border)",
        borderRadius: "var(--input-radius)",
        color: colors.text,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--glow)";
        e.currentTarget.style.borderColor = colors.accentBorder;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
      }}
    >
      {children}
    </button>
  );
}

