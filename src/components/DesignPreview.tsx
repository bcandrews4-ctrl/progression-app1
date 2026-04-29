import React, { useState } from "react";
import { ReadinessCard } from "./ReadinessCard";
import { GlassCard } from "./GlassCard";
import { StatTile } from "./StatTile";
import { PrimaryButton } from "./PrimaryButton";
import { Toggle } from "./Toggle";
import { useTheme } from "../hooks/useTheme";

interface DesignPreviewProps {
  onExit: () => void;
}

export function DesignPreview({ onExit }: DesignPreviewProps) {
  const { c, theme, toggleTheme } = useTheme();
  const [coachMode, setCoachMode] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: c.bg, color: c.text, padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "30px", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: "1.1" }}>Design Preview</div>
          <div style={{ fontSize: "12px", color: c.muted }}>Local-only UI test mode</div>
        </div>
        <PrimaryButton onClick={onExit} variant="outline" style={{ width: "120px", height: "40px" }}>
          Exit Preview
        </PrimaryButton>
      </div>

      <ReadinessCard score={74} sleepHours={7.2} hrv={52} restingHr={58} weeklyVolumeTons={14.6} />

      <GlassCard style={{ marginBottom: "12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <StatTile label="Workouts / mo" value="14" sub="+2 vs last month" accent />
          <StatTile label="Total volume" value="42.6t" sub="this month" />
          <StatTile label="Active cals" value="6,240" sub="this week" />
          <StatTile label="Best lift PR" value="162.5kg" sub="Deadlift" accent />
        </div>
      </GlassCard>

      <GlassCard style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700 }}>Theme</div>
            <div style={{ fontSize: "12px", color: c.muted }}>Current: {theme}</div>
          </div>
          <Toggle on={theme === "dark"} onChange={() => toggleTheme()} />
        </div>
      </GlassCard>

      <GlassCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700 }}>Coach mode preview</div>
            <div style={{ fontSize: "12px", color: c.muted }}>UI-only toggle for quick QA</div>
          </div>
          <Toggle on={coachMode} onChange={setCoachMode} />
        </div>
      </GlassCard>
    </div>
  );
}
