import React from "react";

interface BottomSheetProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(2px)",
        zIndex: 80,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          borderTopLeftRadius: "20px",
          borderTopRightRadius: "20px",
          background: "#0E0E12",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          padding: "12px 16px 18px",
          maxHeight: "70vh",
          overflowY: "auto",
          animation: "slideUp 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "4px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.25)",
            margin: "0 auto 10px",
          }}
        />
        {title ? (
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "10px", color: "#fff" }}>{title}</div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
