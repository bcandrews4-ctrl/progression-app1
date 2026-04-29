import React, { useMemo, useState } from "react";
import { PrimaryButton } from "./PrimaryButton";

interface PlateCalculatorProps {
  onApply: (targetWeightKg: number) => void;
}

const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

export function PlateCalculator({ onApply }: PlateCalculatorProps) {
  const [target, setTarget] = useState("100");

  const perSide = useMemo(() => {
    const targetNum = Number(target);
    if (!Number.isFinite(targetNum) || targetNum <= 20) return [];
    let remain = (targetNum - 20) / 2;
    const used: number[] = [];
    for (const plate of PLATES) {
      while (remain >= plate - 0.001) {
        used.push(plate);
        remain -= plate;
      }
    }
    return used;
  }, [target]);

  return (
    <div className="space-y-3">
      <input
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        inputMode="decimal"
        style={{
          width: "100%",
          height: "52px",
          borderRadius: "12px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#fff",
          textAlign: "center",
          fontSize: "22px",
          fontWeight: 700,
        }}
      />
      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
        Per side plates: {perSide.length ? perSide.join("kg, ") + "kg" : "None"}
      </div>
      <PrimaryButton onClick={() => onApply(Number(target) || 0)} variant="outline">
        Apply to next set
      </PrimaryButton>
    </div>
  );
}
