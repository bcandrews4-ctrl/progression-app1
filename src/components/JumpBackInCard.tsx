import React from "react";
import { GlassCard } from "./GlassCard";
import { PrimaryButton } from "./PrimaryButton";
import { useTheme } from "../hooks/useTheme";

interface JumpBackInCardProps {
  title: string;
  meta: string;
  onResume: () => void;
}

export function JumpBackInCard({ title, meta, onResume }: JumpBackInCardProps) {
  const { c } = useTheme();

  return (
    <GlassCard glow>
      <div style={{ fontSize: "12px", fontWeight: 600, color: c.muted2, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px" }}>
        Jump back in
      </div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: c.text }}>{title}</div>
      <div style={{ fontSize: "13px", color: c.muted, marginTop: "2px", marginBottom: "12px" }}>{meta}</div>
      <PrimaryButton onClick={onResume} style={{ height: "44px" }}>
        Resume Workout
      </PrimaryButton>
    </GlassCard>
  );
}
