import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { radii } from "../styles/tokens";
import { useTheme } from "../hooks/useTheme";
import { BottomSheet } from "./BottomSheet";
import { AreaChart } from "./AreaChart";
import { Toggle } from "./Toggle";
import { WorkoutSummaryData, CompletedSet } from "./WorkoutSummary";
import { LiftEntry } from "../lib/db";
import { ChevronLeft, ChevronRight, Zap, Plus, Check, BarChart2, ChevronDown, RotateCcw } from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────
function calcE1RM(w: number, r: number) {
  return +(w * (1 + r / 30)).toFixed(1);
}

function calcPlates(targetKg: number, barKg = 20) {
  const sideKg = (targetKg - barKg) / 2;
  const available = [25, 20, 15, 10, 5, 2.5, 1.25];
  let rem = sideKg;
  const plates: { weight: number; count: number }[] = [];
  for (const p of available) {
    const n = Math.floor(rem / p);
    if (n > 0) { plates.push({ weight: p, count: n }); rem = +(rem - n * p).toFixed(3); }
  }
  return { plates, sideKg, ok: rem < 0.01 };
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ── SwipeableSetRow ────────────────────────────────────────────────────────
interface SetData {
  id: number;
  weight: string;
  reps: string;
  rir: string;
  done: boolean;
}

interface SwipeableSetRowProps {
  set: SetData;
  idx: number;
  showRIR: boolean;
  onUpdate: (id: number, field: "weight" | "reps" | "rir", val: string) => void;
  onComplete: (id: number) => void;
  accent: string;
}

function SwipeableSetRow({ set, idx, showRIR, onUpdate, onComplete, accent }: SwipeableSetRowProps) {
  const { c } = useTheme();
  const [swipeDx, setSwipeDx] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (set.done) return;
    startX.current = e.clientX;
    setSwiping(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!swiping || startX.current === null) return;
    setSwipeDx(Math.max(0, Math.min(80, e.clientX - startX.current)));
  };
  const onPointerUp = () => {
    if (swipeDx > 50 && !set.done) onComplete(set.id);
    setSwipeDx(0);
    setSwiping(false);
    startX.current = null;
  };

  const vol = set.weight && set.reps ? (parseFloat(set.weight) * parseInt(set.reps)).toFixed(0) : "—";
  const cols = showRIR ? "28px 1fr 1fr 58px 44px 36px" : "28px 1fr 1fr 58px 36px";

  const inputStyle = (done: boolean): React.CSSProperties => ({
    background: done ? "transparent" : "#1a1a1a",
    border: `1px solid ${done ? "transparent" : "rgba(255,255,255,0.12)"}`,
    borderRadius: "8px", padding: "7px 4px",
    fontSize: "16px", fontWeight: 600, color: c.text, textAlign: "center",
    width: "100%", outline: "none", fontFamily: "inherit",
  });

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        display: "grid", gridTemplateColumns: cols, gap: "5px", alignItems: "center",
        padding: "8px", borderRadius: "12px",
        background: set.done ? `${accent}10` : "rgba(255,255,255,0.03)",
        border: `1px solid ${set.done ? `${accent}35` : c.border}`,
        borderLeft: set.done ? `3px solid ${accent}` : `1px solid ${c.border}`,
        transform: `translateX(${swipeDx}px)`,
        transition: swiping ? "none" : "transform 0.25s, background 0.2s, border 0.2s",
        userSelect: "none", touchAction: "pan-y",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 600, color: set.done ? accent : c.muted2, textAlign: "center" }}>
        {idx + 1}
      </div>
      <input
        type="text" inputMode="decimal" value={set.weight} disabled={set.done}
        onChange={(e) => onUpdate(set.id, "weight", e.target.value)}
        style={inputStyle(set.done)}
        onFocus={(e) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 2px ${accent}22`; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
      />
      <input
        type="text" inputMode="numeric" value={set.reps} disabled={set.done}
        onChange={(e) => onUpdate(set.id, "reps", e.target.value)}
        style={inputStyle(set.done)}
        onFocus={(e) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 2px ${accent}22`; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
      />
      <div style={{ fontSize: "12px", color: c.muted, textAlign: "center", fontWeight: 500 }}>{vol}</div>
      {showRIR && (
        <input
          type="text" inputMode="numeric" value={set.rir} disabled={set.done} placeholder="—"
          onChange={(e) => onUpdate(set.id, "rir", e.target.value)}
          style={{ ...inputStyle(set.done), fontSize: "13px", color: c.muted }}
        />
      )}
      <button
        onClick={() => !set.done && onComplete(set.id)}
        style={{
          width: "32px", height: "32px", borderRadius: "50%", border: "none",
          background: set.done ? accent : "rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: set.done ? "default" : "pointer", transition: "all 0.2s", flexShrink: 0,
        }}
      >
        <Check size={14} color={set.done ? "#fff" : c.muted2} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ── PlateViz ───────────────────────────────────────────────────────────────
const PLATE_COLORS: Record<number, string> = {
  25: "#ef4444", 20: "#3b82f6", 15: "#eab308",
  10: "#22c55e", 5: "#fff", 2.5: "#aaa", 1.25: "#666",
};

function PlateViz({ plates, sideKg, barKg, accent }: {
  plates: { weight: number; count: number }[];
  sideKg: number;
  barKg: number;
  accent: string;
}) {
  const { c } = useTheme();
  const allPlates: number[] = [];
  plates.forEach(({ weight, count }) => { for (let i = 0; i < count; i++) allPlates.push(weight); });

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "24px", fontWeight: 700, color: c.text, marginBottom: "4px" }}>
        {barKg + sideKg * 2}kg
      </div>
      <div style={{ fontSize: "12px", color: c.muted, marginBottom: "16px" }}>
        {sideKg}kg per side · Bar {barKg}kg
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px", marginBottom: "16px", overflow: "hidden" }}>
        {[...allPlates].reverse().map((w, i) => (
          <div key={`l${i}`} style={{
            width: "18px", height: `${Math.min(56, 24 + w)}px`, borderRadius: "3px",
            background: PLATE_COLORS[w] || "#888", border: "1px solid rgba(0,0,0,0.3)",
            flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ fontSize: "7px", fontWeight: 700, color: "#000", transform: "rotate(-90deg)", whiteSpace: "nowrap" }}>{w}</div>
          </div>
        ))}
        <div style={{ width: "40px", height: "12px", background: "#888", borderRadius: "2px", flexShrink: 0 }} />
        {allPlates.map((w, i) => (
          <div key={`r${i}`} style={{
            width: "18px", height: `${Math.min(56, 24 + w)}px`, borderRadius: "3px",
            background: PLATE_COLORS[w] || "#888", border: "1px solid rgba(0,0,0,0.3)",
            flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ fontSize: "7px", fontWeight: 700, color: "#000", transform: "rotate(-90deg)", whiteSpace: "nowrap" }}>{w}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
        {plates.map(({ weight, count }) => (
          <div key={weight} style={{
            display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px",
            borderRadius: radii.pill, background: `${PLATE_COLORS[weight] || "#888"}22`,
            border: `1px solid ${PLATE_COLORS[weight] || "#888"}55`,
          }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: PLATE_COLORS[weight] || "#888" }} />
            <span style={{ fontSize: "12px", color: c.text, fontWeight: 600 }}>{count} × {weight}kg</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main WorkoutTracker ────────────────────────────────────────────────────
const EXERCISES = [
  "Bench Press", "Back Squat", "Deadlift", "Overhead Press", "Romanian Deadlift",
  "Barbell Row", "Incline Bench", "Pull-ups", "Dips", "Leg Press", "Leg Curl",
  "Calf Raise", "Cable Row", "Lat Pulldown", "Face Pulls",
  "Cardio – Bike", "Cardio – Rower", "Run",
];

interface WorkoutTrackerProps {
  onBack: () => void;
  onFinish: (data: WorkoutSummaryData) => void;
  accentColor?: string;
  liftHistory?: LiftEntry[];
}

export function WorkoutTracker({ onBack, onFinish, accentColor, liftHistory = [] }: WorkoutTrackerProps) {
  const { c } = useTheme();
  const accent = accentColor || c.accent;

  const [currentExercise, setCurrentExercise] = useState<string | null>(null);
  const [sets, setSets] = useState<SetData[]>([]);
  const [showRIR, setShowRIR] = useState(true);
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerSec, setTimerSec] = useState(90);
  const [timerMax, setTimerMax] = useState(90);
  const [timerActive, setTimerActive] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [plateOpen, setPlateOpen] = useState(false);
  const [plateTarget, setPlateTarget] = useState(162.5);
  const [plateBarKg, setPlateBarKg] = useState(20);
  const [prOpen, setPrOpen] = useState(false);
  const [prData, setPrData] = useState<{ weight: number; reps: number; e1rm: number; prev: number } | null>(null);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Auto-open exercise picker if none selected
  useEffect(() => {
    if (!currentExercise) setJumpOpen(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Workout timer
  useEffect(() => {
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Rest timer
  useEffect(() => {
    if (timerActive && timerSec > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimerSec((s) => {
          if (s <= 4 && s > 1) setPulsing(true);
          else if (s <= 1) setPulsing(false);
          return s - 1;
        });
      }, 1000);
    } else if (timerSec === 0) {
      setTimerActive(false);
      setPulsing(false);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerActive, timerSec]);

  const startTimer = useCallback((secs = 90) => {
    setTimerSec(secs);
    setTimerMax(secs);
    setTimerActive(true);
    setTimerOpen(true);
  }, []);

  const updateSet = (id: number, field: "weight" | "reps" | "rir", val: string) => {
    setSets((prev) => prev.map((s) => s.id === id ? { ...s, [field]: val } : s));
  };

  const completeSet = useCallback((id: number) => {
    setSets((prev) => {
      const updated = prev.map((s) => s.id === id ? { ...s, done: true } : s);
      const set = updated.find((s) => s.id === id);
      if (set && set.weight && set.reps) {
        const w = parseFloat(set.weight), r = parseInt(set.reps);
        const e = calcE1RM(w, r);
        // Track session-best e1RM and surface PR modal if it beats a personal best
        const sessionBest = updated
          .filter((s) => s.done && s.weight && s.reps)
          .reduce((best, s) => Math.max(best, calcE1RM(parseFloat(s.weight), parseInt(s.reps))), 0);
        if (e > sessionBest * 1.01) {
          setPrData({ weight: w, reps: r, e1rm: e, prev: sessionBest });
          setTimeout(() => setPrOpen(true), 400);
        }
      }
      return updated;
    });
    startTimer(90);
  }, [startTimer]);

  const addSet = () => {
    const last = sets[sets.length - 1];
    setSets((prev) => [...prev, { id: Date.now(), weight: last?.weight || "", reps: "", rir: "", done: false }]);
  };

  const nextSet = sets.find((s) => !s.done);
  const allDone = sets.every((s) => s.done);

  // e1RM trend: all historical sets for the selected exercise, sorted by date
  const chartData = useMemo(() => {
    if (!currentExercise) return [];
    return liftHistory
      .filter((l) => l.lift.toLowerCase() === currentExercise.toLowerCase())
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
      .map((l) => ({ label: l.dateISO.slice(5).replace("-", "/"), value: calcE1RM(l.weightKg, l.reps) }));
  }, [currentExercise, liftHistory]);

  // Last recorded set for this exercise → drives weight suggestion
  const lastLift = useMemo(() => {
    if (!currentExercise) return null;
    return liftHistory
      .filter((l) => l.lift.toLowerCase() === currentExercise.toLowerCase())
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))[0] ?? null;
  }, [currentExercise, liftHistory]);

  const suggestion = useMemo(() => {
    if (!nextSet || !lastLift) return null;
    const suggestedWeight = +(lastLift.weightKg + 2.5).toFixed(2);
    // Strip unnecessary trailing zeroes (e.g. 102.50 → 102.5)
    const weightStr = String(parseFloat(suggestedWeight.toFixed(2)));
    return {
      weight: weightStr,
      reps: String(lastLift.reps),
      note: `+2.5kg from last time (${lastLift.weightKg}kg × ${lastLift.reps})`,
    };
  }, [nextSet, lastLift]);
  const sessionVol = sets.filter((s) => s.done && s.weight && s.reps).reduce((acc, s) => acc + parseFloat(s.weight) * parseInt(s.reps), 0);
  const doneSets = sets.filter((s) => s.done).length;
  const pct = (timerSec / timerMax) * 100;
  const r = 54, circ = 2 * Math.PI * r;
  const timerLow = timerSec <= 30 && timerActive;
  const plateCalc = calcPlates(plateTarget, plateBarKg);

  const handleFinish = () => {
    const exName = currentExercise ?? "Workout";
    const doneSetsData = sets.filter((s) => s.done && s.weight && s.reps);
    const topSet = doneSetsData.sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight))[0];
    const topSetStr = topSet ? `${topSet.weight}kg × ${topSet.reps}` : "—";

    const completedSets: CompletedSet[] = doneSetsData.map((s) => ({
      exercise: exName,
      weightKg: parseFloat(s.weight),
      reps: parseInt(s.reps),
      ...(s.rir ? { rpe: Math.max(0, 10 - parseInt(s.rir)) } : {}),
    }));

    onFinish({
      duration: fmt(elapsed),
      totalVolume: `${(sessionVol / 1000).toFixed(2)}t`,
      sets: doneSets,
      prs: prData ? [{ lift: exName, weight: prData.weight, reps: prData.reps, e1rm: prData.e1rm }] : [],
      exercises: doneSets > 0 ? [{ name: exName, sets: doneSets, topSet: topSetStr }] : [],
      completedSets,
    });
  };

  return (
    <div style={{ height: "100%", background: c.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Pulse overlay */}
      {pulsing && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50, pointerEvents: "none",
          border: `3px solid ${accent}`, borderRadius: "20px",
          animation: "pulseBorder 0.5s ease infinite alternate", opacity: 0.6,
        }} />
      )}

      {/* Sticky header */}
      <div style={{ background: c.bg, borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 16px 10px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: c.muted, display: "flex", padding: "4px", fontFamily: "inherit" }}>
            <ChevronLeft size={20} color={c.muted} />
          </button>
          <button
            onClick={() => setJumpOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: c.muted, padding: 0, fontFamily: "inherit" }}
          >
            <span>Train</span>
            <ChevronRight size={14} color={c.muted2} />
            <span style={{ color: currentExercise ? c.text : accent, fontWeight: 600 }}>
              {currentExercise ?? "Select exercise"}
            </span>
            <ChevronDown size={13} color={c.muted2} />
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ fontSize: "12px", color: c.muted, fontWeight: 500 }}>{fmt(elapsed)}</div>
            <div style={{
              padding: "3px 8px", borderRadius: radii.pill, fontSize: "11px", fontWeight: 600,
              background: `${accent}22`, color: accent, border: `1px solid ${accent}44`,
            }}>
              Vol {(sessionVol / 1000).toFixed(1)}t
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: "2px", background: c.border }}>
          <div style={{
            height: "100%", background: accent,
            width: `${Math.round((doneSets / sets.length) * 100)}%`,
            transition: "width 0.4s ease", borderRadius: "0 2px 2px 0",
          }} />
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 100px" }}>
        {/* e1RM chart / exercise selector prompt */}
        <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "12px 12px 8px", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: c.muted2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {currentExercise ? `e1RM trend — ${currentExercise}` : "e1RM trend"}
            </div>
            {chartData.length >= 2 && (() => {
              const first = chartData[0].value;
              const last = chartData[chartData.length - 1].value;
              const pctChange = (((last - first) / first) * 100).toFixed(1);
              const up = last >= first;
              return (
                <div style={{ display: "flex", gap: "6px" }}>
                  <div style={{ padding: "2px 8px", borderRadius: radii.pill, fontSize: "11px", fontWeight: 600, background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}>
                    {up ? "+" : ""}{pctChange}%
                  </div>
                  <div style={{ padding: "2px 8px", borderRadius: radii.pill, fontSize: "11px", fontWeight: 600, background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}>
                    {chartData.length} sessions
                  </div>
                </div>
              );
            })()}
          </div>
          {currentExercise ? (
            chartData.length > 0 ? (
              <AreaChart data={chartData} height={80} />
            ) : (
              <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>No history yet — finish your first set to start the trend</span>
              </div>
            )
          ) : (
            <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <button
                onClick={() => setJumpOpen(true)}
                style={{ background: `${accent}18`, border: `1px dashed ${accent}55`, borderRadius: "10px", padding: "10px 20px", color: accent, fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                + Select an exercise to begin
              </button>
            </div>
          )}
        </div>

        {/* Overload suggestion */}
        {suggestion && (
          <div style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
            marginBottom: "10px", borderRadius: "10px",
            background: `${accent}10`, border: `1px solid ${accent}33`,
          }}>
            <Zap size={16} color={accent} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: c.text }}>Try {suggestion.weight}kg × {suggestion.reps}</span>
              <span style={{ fontSize: "12px", color: c.muted }}> — {suggestion.note}</span>
            </div>
            <button
              onClick={() => { if (nextSet) { updateSet(nextSet.id, "weight", suggestion.weight); updateSet(nextSet.id, "reps", suggestion.reps); } }}
              style={{ padding: "4px 10px", borderRadius: radii.pill, background: accent, border: "none", color: "#fff", fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              Apply
            </button>
          </div>
        )}

        {/* Set header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: c.text }}>Sets</div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => { const last = sets.find((s) => s.weight); setPlateTarget(parseFloat(last?.weight || "100")); setPlateOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: radii.pill, background: c.cardBg2, border: `1px solid ${c.border}`, color: c.muted, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
            >
              <BarChart2 size={12} color={c.muted} /> Plates
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ fontSize: "11px", color: c.muted }}>RIR</div>
              <Toggle on={showRIR} onChange={setShowRIR} />
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: showRIR ? "28px 1fr 1fr 58px 44px 36px" : "28px 1fr 1fr 58px 36px", gap: "5px", padding: "0 4px 5px" }}>
          {["#", "Weight", "Reps", "Vol", ...(showRIR ? ["RIR"] : []), ""].map((h, i) => (
            <div key={i} style={{ fontSize: "10px", color: c.muted2, fontWeight: 500, textAlign: i > 0 ? "center" : "left" }}>{h}</div>
          ))}
        </div>

        <div style={{ fontSize: "11px", color: c.muted2, marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
          <ChevronRight size={10} color={c.muted2} /> Swipe right to complete
        </div>

        {/* Sets */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
          {sets.map((set, idx) => (
            <SwipeableSetRow key={set.id} set={set} idx={idx} showRIR={showRIR} onUpdate={updateSet} onComplete={completeSet} accent={accent} />
          ))}
        </div>

        {/* Add set */}
        <button
          onClick={addSet}
          style={{
            width: "100%", padding: "11px", borderRadius: "12px",
            background: "transparent", border: `1px dashed ${c.border}`,
            color: c.muted, fontSize: "13px", fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            fontFamily: "inherit", marginBottom: "12px",
          }}
        >
          <Plus size={15} color={c.muted} /> Add set
        </button>

        {/* Action row */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
          {[
            { label: "Replace", icon: <RotateCcw size={12} color={c.muted} /> },
            { label: "Warm-up", icon: <Zap size={12} color={c.muted} /> },
            { label: "Jump to", icon: <ChevronDown size={12} color={c.muted} />, onClick: () => setJumpOpen(true) },
          ].map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              style={{
                flex: 1, padding: "9px 6px", borderRadius: "10px",
                background: "transparent", border: `1px solid ${c.border}`,
                color: c.muted, fontSize: "11px", fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                fontFamily: "inherit",
              }}
            >
              {a.icon}{a.label}
            </button>
          ))}
        </div>

        {/* Finish */}
        <button
          onClick={handleFinish}
          style={{
            width: "100%", height: "48px", borderRadius: radii.pill, fontSize: "15px", fontWeight: 600,
            background: allDone ? accent : "transparent",
            color: allDone ? "#fff" : c.muted,
            border: allDone ? "none" : `1px solid ${c.borderMid}`,
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}
        >
          <Check size={18} color={allDone ? "#fff" : c.muted} /> Finish Workout
        </button>
      </div>

      {/* Rest timer sheet */}
      <BottomSheet open={timerOpen} onClose={() => { setTimerOpen(false); setTimerActive(false); }}>
        <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: c.muted, marginBottom: "20px", fontWeight: 600 }}>Rest Timer</div>

          {/* Ring + nudge buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginBottom: "22px" }}>
            <button
              onClick={() => setTimerSec((s) => Math.max(0, s - 15))}
              style={{
                width: "42px", height: "42px", borderRadius: "50%",
                background: "rgba(255,255,255,0.06)", border: `1px solid ${c.border}`,
                color: c.muted, fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              −15
            </button>
            <svg width="136" height="136" viewBox="0 0 136 136">
              <circle cx="68" cy="68" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
              <circle
                cx="68" cy="68" r={r} fill="none"
                stroke={pulsing ? c.orange : timerLow ? c.orange : accent} strokeWidth="9"
                strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
                strokeLinecap="round" transform="rotate(-90 68 68)"
                style={{ transition: pulsing ? "none" : "stroke-dashoffset 1s linear, stroke 0.5s" }}
              />
              <text x="68" y="62" textAnchor="middle" fontSize="30" fontWeight="700" fill={c.text} fontFamily="monospace">{fmt(timerSec)}</text>
              <text x="68" y="82" textAnchor="middle" fontSize="11" fill={c.muted} fontFamily="inherit">remaining</text>
            </svg>
            <button
              onClick={() => setTimerSec((s) => s + 15)}
              style={{
                width: "42px", height: "42px", borderRadius: "50%",
                background: "rgba(255,255,255,0.06)", border: `1px solid ${c.border}`,
                color: c.muted, fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              +15
            </button>
          </div>

          {/* Preset chips */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "20px" }}>
            {([60, 90, 120, 180] as const).map((s) => {
              const active = timerMax === s;
              const label = s === 60 ? "1:00" : s === 90 ? "1:30" : s === 120 ? "2:00" : "3:00";
              return (
                <button
                  key={s}
                  onClick={() => startTimer(s)}
                  style={{
                    padding: "7px 14px", borderRadius: radii.pill, fontSize: "13px", fontWeight: 600,
                    background: active ? accent : "rgba(255,255,255,0.05)",
                    border: `1px solid ${active ? accent : c.border}`,
                    color: active ? "#fff" : c.muted,
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "background 200ms, color 200ms",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Dismiss — ghost text */}
          <button
            onClick={() => { setTimerOpen(false); setTimerActive(false); }}
            style={{
              background: "none", border: "none",
              color: c.muted, fontSize: "14px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Dismiss
          </button>
        </div>
      </BottomSheet>

      {/* Plate calculator sheet */}
      <BottomSheet open={plateOpen} onClose={() => setPlateOpen(false)} title="Plate calculator">
        <div style={{ paddingBottom: "8px" }}>
          {/* Bar weight toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ fontSize: "12px", color: c.muted, fontWeight: 500 }}>Bar weight</span>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "999px", padding: "3px", gap: "2px" }}>
              {[15, 20].map((kg) => (
                <button
                  key={kg}
                  onClick={() => setPlateBarKg(kg)}
                  style={{
                    padding: "5px 14px", borderRadius: "999px", fontSize: "13px", fontWeight: 600,
                    background: plateBarKg === kg ? accent : "transparent",
                    color: plateBarKg === kg ? "#fff" : c.muted,
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    transition: "background 200ms, color 200ms",
                  }}
                >
                  {kg}kg
                </button>
              ))}
            </div>
          </div>

          {/* Weight input with stepper */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <button
              onClick={() => setPlateTarget((t) => Math.max(plateBarKg, +(t - 2.5).toFixed(2)))}
              style={{
                width: "44px", height: "44px", flexShrink: 0, borderRadius: "50%",
                background: "rgba(255,255,255,0.07)", border: `1px solid ${c.border}`,
                color: c.text, fontSize: "20px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              −
            </button>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                type="text" inputMode="decimal" value={plateTarget}
                onChange={(e) => setPlateTarget(parseFloat(e.target.value) || 0)}
                style={{
                  width: "100%", background: c.cardBg2, border: `1px solid ${c.border}`,
                  borderRadius: "14px", padding: "12px 40px 12px 12px", fontSize: "26px", fontWeight: 700,
                  color: c.text, outline: "none", fontFamily: "inherit", textAlign: "center",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { e.target.style.borderColor = accent; }}
                onBlur={(e) => { e.target.style.borderColor = c.border; }}
              />
              <span style={{
                position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                fontSize: "14px", color: c.muted, fontWeight: 500, pointerEvents: "none",
              }}>kg</span>
            </div>
            <button
              onClick={() => setPlateTarget((t) => +(t + 2.5).toFixed(2))}
              style={{
                width: "44px", height: "44px", flexShrink: 0, borderRadius: "50%",
                background: "rgba(255,255,255,0.07)", border: `1px solid ${c.border}`,
                color: c.text, fontSize: "20px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              +
            </button>
          </div>

          <PlateViz plates={plateCalc.plates} sideKg={plateCalc.sideKg} barKg={plateBarKg} accent={accent} />

          <div style={{ marginTop: "20px" }}>
            <button
              onClick={() => { if (nextSet) updateSet(nextSet.id, "weight", String(plateTarget)); setPlateOpen(false); }}
              style={{
                width: "100%", height: "48px", borderRadius: radii.pill,
                background: accent, color: "#fff", border: "none",
                fontSize: "15px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                boxShadow: `0 4px 16px ${accent}44`,
              }}
            >
              Apply to next set
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* PR celebration sheet */}
      <BottomSheet open={prOpen} onClose={() => setPrOpen(false)}>
        {prData && (
          <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🏆</div>
            <div style={{ fontSize: "26px", fontWeight: 700, color: c.text, marginBottom: "6px" }}>New PR!</div>
            <div style={{ fontSize: "16px", color: c.muted, marginBottom: "18px" }}>You just broke your Back Squat record</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              <div style={{ background: c.cardBg2, borderRadius: "12px", border: `1px solid ${c.border}`, padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: c.muted2, marginBottom: "4px" }}>NEW e1RM</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: accent }}>{prData.e1rm}kg</div>
              </div>
              <div style={{ background: c.cardBg2, borderRadius: "12px", border: `1px solid ${c.border}`, padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: c.muted2, marginBottom: "4px" }}>PREVIOUS</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: c.muted }}>{prData.prev}kg</div>
              </div>
            </div>
            <button
              onClick={() => setPrOpen(false)}
              style={{
                width: "100%", height: "44px", borderRadius: radii.pill,
                background: accent, color: "#fff", border: "none",
                fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Keep going 💪
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Exercise selector sheet */}
      <BottomSheet open={jumpOpen} onClose={() => setJumpOpen(false)} title="Select exercise">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {EXERCISES.map((ex) => {
            const isActive = ex === currentExercise;
            return (
              <div
                key={ex}
                onClick={() => { setCurrentExercise(ex); setJumpOpen(false); }}
                style={{
                  padding: "13px 12px", borderRadius: "12px",
                  background: isActive ? `${accent}15` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? `${accent}55` : c.border}`,
                  cursor: "pointer", fontSize: "15px",
                  color: isActive ? accent : c.text,
                  fontWeight: isActive ? 600 : 400,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                {ex}
                {isActive && (
                  <div style={{ padding: "2px 8px", borderRadius: radii.pill, fontSize: "11px", fontWeight: 600, background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}>
                    Current
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}
