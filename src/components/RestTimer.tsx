import React, { useEffect, useMemo, useState } from "react";
import { PrimaryButton } from "./PrimaryButton";

interface RestTimerProps {
  defaultSeconds?: number;
}

export function RestTimer({ defaultSeconds = 90 }: RestTimerProps) {
  const [total, setTotal] = useState(defaultSeconds);
  const [left, setLeft] = useState(defaultSeconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || left <= 0) return;
    const t = window.setTimeout(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [running, left]);

  const progress = useMemo(() => (total <= 0 ? 0 : left / total), [left, total]);
  const r = 44;
  const circ = 2 * Math.PI * r;
  const warn = left <= 3 && running;

  return (
    <div className="space-y-3">
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 108, height: 108 }}>
          <svg viewBox="0 0 108 108" width="108" height="108" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="8" />
            <circle
              cx="54"
              cy="54"
              r={r}
              fill="none"
              stroke={warn ? "#f97316" : "#0000ff"}
              strokeWidth="8"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progress)}
              strokeLinecap="round"
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", fontWeight: 700 }}>
            {left}s
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[60, 90, 120, 180].map((p) => (
          <button
            key={p}
            onClick={() => {
              setTotal(p);
              setLeft(p);
              setRunning(false);
            }}
            style={{ borderRadius: "999px", height: 34, border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
          >
            {p}s
          </button>
        ))}
      </div>
      <PrimaryButton onClick={() => setRunning((v) => !v)}>{running ? "Pause" : "Start timer"}</PrimaryButton>
    </div>
  );
}
