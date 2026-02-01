import React from "react";
import { colors, radii, shadows } from "../styles/tokens";

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function PrimaryButton({ children, onClick, disabled = false, className = "" }: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3.5 font-semibold transition-all duration-200 active:scale-[0.98] disabled:active:scale-100 ${className}`}
      style={{
        background: disabled ? "var(--surface)" : colors.accent,
        color: colors.text,
        border: disabled ? "var(--border)" : "none",
        borderRadius: "var(--btn-radius)",
        boxShadow: disabled ? "none" : "var(--glow)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

