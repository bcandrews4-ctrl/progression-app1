import React from "react";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageShell - Provides consistent horizontal padding, top spacing, and bottom spacing (tab bar safe zone).
 * Controls max width (560px mobile-first) and centers content.
 */
export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <div
      className={className}
      style={{
        width: "100%",
        maxWidth: "560px",
        margin: "0 auto",
        paddingLeft: "var(--page-pad-x)",
        paddingRight: "var(--page-pad-x)",
        paddingTop: "16px",
        paddingBottom: "calc(var(--tabbar-h) + var(--tabbar-bottom-offset, 12px) + 16px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {children}
    </div>
  );
}
