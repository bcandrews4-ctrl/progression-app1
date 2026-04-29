import React from "react";
import { useTheme } from "../hooks/useTheme";

interface DeviceSyncStripProps {
  stravaConnected: boolean;
}

export function DeviceSyncStrip({ stravaConnected }: DeviceSyncStripProps) {
  const { c } = useTheme();

  const devices = [
    { name: "Garmin", ok: false },
    { name: "Strava", ok: stravaConnected },
    { name: "Watch", ok: true },
  ];

  return (
    <div
      style={{
        background: c.cardBg2,
        border: `1px solid ${c.border}`,
        borderRadius: "16px",
        padding: "12px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: c.muted2, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Device Sync
        </div>
        <div style={{ fontSize: "11px", color: c.muted }}>Synced 4 min ago</div>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        {devices.map((d) => (
          <div
            key={d.name}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              padding: "10px 4px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "10px",
              border: `1px solid ${c.border}`,
            }}
          >
            <div style={{ position: "relative" }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: d.ok ? c.green : c.muted2,
                  position: "absolute",
                  bottom: -2,
                  right: -4,
                  border: `1.5px solid ${c.cardBg2}`,
                }}
              />
              <div style={{ width: 22, height: 22, background: c.border, borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: "10px", color: d.ok ? c.muted : c.muted2, fontWeight: 500 }}>{d.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
