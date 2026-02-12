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
      style={{
        width: "min(520px, calc(100vw - 24px))",
        maxWidth: "100%",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: radii["2xl"],
          padding: "8px 10px",
          boxShadow: shadows.dock,
          height: "var(--tabbar-h, 84px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="flex items-center gap-2" style={{ width: "100%", justifyContent: "space-around" }}>
          {tabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative flex flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-200 active:scale-95"
                style={{
                  color: active ? colors.text : colors.muted,
                  minWidth: "64px",
                  flex: "1 1 0",
                  padding: "8px 4px",
                  maxWidth: "100px",
                }}
              >
                {active && (
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: `1px solid ${colors.border}`,
                    }}
                  />
                )}
                <div
                  className="relative z-10 transition-all duration-200"
                  style={{
                    transform: active ? "scale(1.05)" : "scale(1)",
                    filter: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {tab.icon}
                </div>
                <div
                  className="relative z-10 font-medium transition-all duration-200"
                  style={{
                    opacity: active ? 1 : 0.7,
                    fontSize: "10px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
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

