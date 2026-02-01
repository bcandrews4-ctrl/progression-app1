import React from "react";
import { colors } from "../styles/tokens";

interface AppLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  tabBar?: React.ReactNode;
}

export function AppLayout({ children, header, tabBar }: AppLayoutProps) {
  // Set CSS variables and prevent body scroll on mount
  React.useEffect(() => {
    // Set CSS variables
    document.documentElement.style.setProperty("--tabbar-h", "84px");
    document.documentElement.style.setProperty("--tabbar-bottom-offset", "12px");
    document.documentElement.style.setProperty("--safe-bottom", "env(safe-area-inset-bottom, 0px)");
    
    // Ensure body and html have black background
    document.body.style.background = "#000000";
    document.documentElement.style.background = "#000000";
    
    // Prevent body scroll
    document.body.style.overflow = "hidden";
    document.body.style.height = "100dvh";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overscrollBehaviorY = "none";
    
    return () => {
      // Cleanup on unmount
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.body.style.margin = "";
      document.body.style.padding = "";
      document.body.style.background = "";
      document.body.style.overscrollBehaviorY = "";
      document.documentElement.style.background = "";
    };
  }, []);

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: colors.bg,
        color: colors.text,
        overflow: "hidden",
        position: "relative",
      }}
    >

      {/* Header */}
      {header && (
        <div
          style={{
            flexShrink: 0,
            paddingTop: "calc(16px + env(safe-area-inset-top, 0px))",
            paddingLeft: "clamp(16px, 4vw, 24px)",
            paddingRight: "clamp(16px, 4vw, 24px)",
            paddingBottom: "12px",
          }}
        >
          {header}
        </div>
      )}

      {/* Scrollable Content Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "none",
          background: colors.bg,
          paddingLeft: "var(--page-pad-x)",
          paddingRight: "var(--page-pad-x)",
          paddingTop: header ? "0" : "calc(16px + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(var(--tabbar-h) + var(--tabbar-bottom-offset) + 16px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {children}
      </div>

      {/* Floating Tab Bar */}
      {tabBar && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            background: colors.bg,
            paddingBottom: "calc(var(--tabbar-bottom-offset) + env(safe-area-inset-bottom, 0px))",
            minHeight: "calc(var(--tabbar-h) + var(--tabbar-bottom-offset) + env(safe-area-inset-bottom, 0px))",
            pointerEvents: "none",
          }}
        >
          {tabBar}
        </div>
      )}
    </div>
  );
}
