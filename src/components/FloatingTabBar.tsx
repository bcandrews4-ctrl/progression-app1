import React from "react";
import { colors, radii, shadows } from "../styles/tokens";

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface FloatingTabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function FloatingTabBar({ tabs, activeTab, onTabChange }: FloatingTabBarProps) {
  return (
    <div
      className="fixed z-[9999]"
      style={{
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "rgba(10,10,14,0.75)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: `1px solid ${colors.border}`,
          borderRadius: radii["3xl"],
          padding: "8px",
          boxShadow: shadows.dock,
          pointerEvents: "auto",
          minWidth: "fit-content",
        }}
      >
      <div className="flex items-center gap-2">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 active:scale-95"
              style={{
                color: active ? colors.text : colors.muted,
                minWidth: "64px",
              }}
            >
              {active && (
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: colors.accentSoft,
                    border: `1px solid ${colors.accentBorder}`,
                    boxShadow: shadows.glowInner,
                  }}
                />
              )}
              <div
                className="relative z-10 transition-all duration-200"
                style={{
                  transform: active ? "scale(1.1)" : "scale(1)",
                  filter: active ? `drop-shadow(0 2px 4px ${colors.accentGlow})` : "none",
                }}
              >
                {tab.icon}
              </div>
              <div
                className="relative z-10 text-[10px] font-medium transition-all duration-200"
                style={{
                  opacity: active ? 1 : 0.7,
                }}
              >
                {tab.label}
              </div>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}

