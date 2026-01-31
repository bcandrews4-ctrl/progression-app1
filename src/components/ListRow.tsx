import React from "react";
import { colors, radii } from "../styles/tokens";

interface ListRowProps {
  title: string;
  subtitle: string;
  right: string;
  onClick?: () => void;
  className?: string;
}

export function ListRow({ title, subtitle, right, onClick, className = "" }: ListRowProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl px-4 py-3 transition-all duration-200 hover:opacity-90 active:scale-[0.98] ${className}`}
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: colors.text }}>
            {title}
          </div>
          <div className="text-xs mt-0.5" style={{ color: colors.muted }}>
            {subtitle}
          </div>
        </div>
        <div className="text-sm font-medium" style={{ color: colors.text }}>
          {right}
        </div>
      </div>
    </button>
  );
}

