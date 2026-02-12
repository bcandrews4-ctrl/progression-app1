import React from "react";
import { colors, radii, shadows } from "../styles/tokens";

interface PrimaryButtonProps {
  children?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function PrimaryButton({ children, onClick, disabled = false, className = "", style }: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3.5 font-semibold transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 ${className}`}
      style={{
        background: disabled ? colors.cardBg : colors.accent,
        color: colors.text,
        border: disabled ? `1px solid ${colors.border}` : "1px solid transparent",
        borderRadius: "var(--btn-radius)",
        boxShadow: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

