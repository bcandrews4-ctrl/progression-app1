import React, { useState } from "react";
import { radii } from "../styles/tokens";
import { useTheme } from "../hooks/useTheme";
import { BottomSheet } from "./BottomSheet";
import { Trophy, Zap, Users } from "lucide-react";

interface PR {
  lift: string;
  weight: number;
  reps: number;
  e1rm: number;
}

interface ExerciseSummary {
  name: string;
  sets: number;
  topSet: string;
}

export interface WorkoutSummaryData {
  duration: string;
  totalVolume: string;
  sets: number;
  prs: PR[];
  exercises: ExerciseSummary[];
}

interface WorkoutSummaryProps {
  data: WorkoutSummaryData;
  onDone: () => void;
  onShare?: () => void;
}

export function WorkoutSummary({ data, onDone }: WorkoutSummaryProps) {
  const { c } = useTheme();
  const [showShare, setShowShare] = useState(false);
  const { duration, totalVolume, sets, prs, exercises } = data;

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{
      minHeight: "100%", background: c.bg, display: "flex", flexDirection: "column",
      padding: "0 16px", overflowY: "auto",
    }}>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "48px 0 32px" }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "24px", margin: "0 auto 20px",
          background: c.accentSoft, border: `1px solid ${c.accentBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 24px ${c.accentGlow}`,
        }}>
          <Trophy size={40} color={c.accent} />
        </div>
        <div style={{ fontSize: "32px", fontWeight: 700, color: c.text, lineHeight: 1.1, marginBottom: "8px" }}>
          Session complete 💪
        </div>
        <div style={{ fontSize: "15px", color: c.muted }}>{today}</div>
      </div>

      {/* Big stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
        {[
          { label: "Duration", value: duration },
          { label: "Volume", value: totalVolume },
          { label: "Sets", value: String(sets) },
        ].map((s) => (
          <div key={s.label} style={{
            background: c.cardBg2, borderRadius: radii.card, border: `1px solid ${c.border}`,
            padding: "14px 10px", textAlign: "center",
          }}>
            <div style={{ fontSize: "22px", fontWeight: 700, color: c.text }}>{s.value}</div>
            <div style={{ fontSize: "11px", color: c.muted, marginTop: "3px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* PRs */}
      {prs.length > 0 && (
        <div style={{
          background: c.accentSoft, border: `1px solid ${c.accentBorder}`,
          borderRadius: radii.card, padding: "14px 16px", marginBottom: "14px",
          boxShadow: `0 0 24px ${c.accentGlow}`,
        }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: c.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
            🏆 New PRs set
          </div>
          {prs.map((pr, i) => (
            <div key={i} style={{ fontSize: "15px", fontWeight: 600, color: c.text, marginBottom: i < prs.length - 1 ? "4px" : 0 }}>
              {pr.lift} — {pr.weight}kg × {pr.reps}{" "}
              <span style={{ color: c.accent, fontSize: "13px" }}>e1RM {pr.e1rm}kg</span>
            </div>
          ))}
        </div>
      )}

      {/* Exercise breakdown */}
      <div style={{ background: c.cardBg2, borderRadius: radii.card, border: `1px solid ${c.border}`, padding: "14px 16px", marginBottom: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: c.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
          Exercises
        </div>
        {exercises.map((ex, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 0", borderBottom: i < exercises.length - 1 ? `1px solid ${c.border}` : "none",
          }}>
            <div style={{ fontSize: "14px", color: c.text, fontWeight: 500 }}>{ex.name}</div>
            <div style={{ fontSize: "13px", color: c.muted }}>{ex.sets} sets · {ex.topSet}</div>
          </div>
        ))}
      </div>

      {/* AI insight */}
      <div style={{
        background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card,
        padding: "14px 16px", marginBottom: "20px", display: "flex", gap: "10px",
      }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
          background: c.accentSoft, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Zap size={16} color={c.accent} />
        </div>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: c.accent, marginBottom: "3px" }}>AI insight</div>
          <div style={{ fontSize: "13px", color: c.muted, lineHeight: 1.5 }}>
            Volume up 8% vs last session. Your squat e1RM is trending toward 185kg — on track within 3 weeks at this rate.
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingBottom: "40px" }}>
        <button
          onClick={() => setShowShare(true)}
          style={{
            width: "100%", height: "52px", borderRadius: radii.pill,
            background: c.accent, color: "#fff", border: "none",
            fontSize: "16px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}
        >
          <Users size={18} color="#fff" />
          Share to community
        </button>
        <button
          onClick={onDone}
          style={{
            width: "100%", height: "52px", borderRadius: radii.pill,
            background: "transparent", color: c.text, border: `1px solid ${c.borderMid}`,
            fontSize: "16px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Back to dashboard
        </button>
      </div>

      {/* Share sheet */}
      <BottomSheet open={showShare} onClose={() => setShowShare(false)} title="Share workout">
        <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
          <div style={{
            background: c.accentSoft, border: `1px solid ${c.accentBorder}`,
            borderRadius: "12px", padding: "16px", marginBottom: "16px",
          }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: c.text, marginBottom: "4px" }}>
              Just hit a new PR 🏆
            </div>
            <div style={{ fontSize: "13px", color: c.muted }}>
              {prs[0] ? `${prs[0].lift} ${prs[0].weight}kg × ${prs[0].reps} · e1RM ${prs[0].e1rm}kg · ` : ""}{duration} session
            </div>
            <div style={{ fontSize: "11px", color: c.accent, marginTop: "6px" }}>#HybridHouse #PR</div>
          </div>
          <button
            onClick={() => setShowShare(false)}
            style={{
              width: "100%", height: "44px", borderRadius: radii.pill,
              background: c.accent, color: "#fff", border: "none",
              fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Post to Hybrid House
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
