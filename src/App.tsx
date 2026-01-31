import React, { useEffect, useMemo, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
  BarChart,
  Bar,
} from "recharts";

import { colors, radii, shadows, gradients, typography } from "./styles/tokens";
import { GlassCard } from "./components/GlassCard";
import { PrimaryButton } from "./components/PrimaryButton";
import { IconButton } from "./components/IconButton";
import { SegmentedControl } from "./components/SegmentedControl";
import { StatTile } from "./components/StatTile";
import { ListRow } from "./components/ListRow";
import { FloatingTabBar } from "./components/FloatingTabBar";
import { HealthMetricTile } from "./components/HealthMetricTile";

type TrainingFocus = "STRENGTH" | "HYPERTROPHY" | "HYBRID";

type LiftType =
  | "Deadlift"
  | "Back Squat"
  | "Front Squat"
  | "Bench Press"
  | "Incline Bench Press";

type CardioMachine = "RowErg" | "BikeErg" | "SkiErg" | "Assault Bike";

type JournalTab = "All" | "Lifts" | "Cardio" | "Running";

type DateRange = "30" | "90" | "365";

type AppTab = "Overview" | "Journal" | "Progress" | "Health" | "Profile";

type LiftEntry = {
  id: string;
  dateISO: string; // yyyy-mm-dd
  lift: LiftType;
  weightKg: number;
  reps: number;
  rpe?: number; // 1-10, optional
};

type CardioEntry = {
  id: string;
  dateISO: string;
  machine: CardioMachine;
  seconds: number;
  calories: number;
};

type RunEntry = {
  id: string;
  dateISO: string;
  distanceMeters: number;
  inputType: "TIME" | "PACE";
  timeSeconds?: number;
  paceSecPerKm?: number;
  rounds: number;
};

type ImportedWorkout = {
  id: string;
  dateISO: string;
  source: "Apple Health" | "Health Connect";
  workoutType: "Strength" | "Cardio" | "Run";
  minutes: number;
  activeCalories?: number;
  distanceKm?: number;
};

type HealthPeriod = "Daily" | "Weekly" | "Monthly";

type SleepStage = "Awake" | "REM" | "Core" | "Deep";

type SleepStageData = {
  time: string; // "HH:MM" format
  stage: SleepStage;
};

type HealthMetric = {
  dateISO: string;
  steps: number;
  sleepHours: number;
  sleepStages?: SleepStageData[]; // Time-series sleep stage data
  avgBPM: number;
  caloriesBurned: number;
  activeMinutes: number;
};

// Using design tokens from tokens.ts
const ACCENT = colors.accent;
const BG = colors.bg;
const CARD = colors.cardBg;
const CARD2 = colors.cardBg2;
const MUTED = colors.muted;
const TEXT = colors.text;
const BORDER = colors.border;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatMMSS(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${pad2(r)}`;
}

function formatPace(secPerKm: number) {
  const s = Math.max(0, Math.round(secPerKm));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${pad2(r)}/km`;
}

function parseTimeToSeconds(mmss: string): number | null {
  const t = mmss.trim();
  if (!t) return null;
  const parts = t.split(":");
  if (parts.length !== 2) return null;
  const m = Number(parts[0]);
  const s = Number(parts[1]);
  if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
  if (m < 0 || s < 0 || s >= 60) return null;
  return m * 60 + s;
}

function parsePaceToSecPerKm(pace: string): number | null {
  const cleaned = pace.replace("/km", "").trim();
  return parseTimeToSeconds(cleaned);
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${pad2(m)}-${pad2(day)}`;
}

function isoToDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function e1rm(weightKg: number, reps: number) {
  return weightKg * (1 + reps / 30);
}

function kgToTonnage(kg: number) {
  return kg / 1000;
}

function sum<T>(arr: T[], pick: (t: T) => number) {
  return arr.reduce((acc, x) => acc + pick(x), 0);
}

function groupByDay<T extends { dateISO: string }>(items: T[]) {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const key = it.dateISO;
    const list = map.get(key) ?? [];
    list.push(it);
    map.set(key, list);
  }
  return map;
}

function withinLastDays(dateISO: string, days: number) {
  const cutoff = isoToDate(daysAgoISO(days));
  return isoToDate(dateISO) >= cutoff;
}

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Icon({ name }: { name: "overview" | "journal" | "progress" | "health" | "profile" }) {
  const common = "w-5 h-5";
  if (name === "overview") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 13h7V4H4v9Zm9 7h7V11h-7v9ZM4 20h7v-5H4v5Zm9-11h7V4h-7v5Z" fill="currentColor" />
      </svg>
    );
  }
  if (name === "journal") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M6 3h10a2 2 0 0 1 2 2v16a1 1 0 0 1-1.447.894L13 20.118l-3.553 1.776A1 1 0 0 1 8 21V5a2 2 0 0 0-2-2Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path d="M6 3a2 2 0 0 0-2 2v16h4V5a2 2 0 0 0-2-2Z" fill="currentColor" opacity="0.55" />
      </svg>
    );
  }
  if (name === "progress") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 18V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 18H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 14l3-3 3 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "health") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
      style={{
        background: "rgba(0,0,255,0.15)",
        color: "rgba(0,0,255,0.95)",
        border: `1px solid rgba(0,0,255,0.3)`,
        boxShadow: "0 1px 3px rgba(0,0,255,0.2)",
      }}
    >
      {children}
    </span>
  );
}

// SegmentedControl and StatTile are now imported from components

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl" style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="text-sm font-semibold" style={{ color: TEXT }}>
          {title}
        </div>
        {right}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function formatDateShort(iso: string) {
  const d = isoToDate(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function buildSampleData() {
  const focus: TrainingFocus = "HYBRID";

  const lifts: LiftEntry[] = [
    { id: "l1", dateISO: daysAgoISO(26), lift: "Bench Press", weightKg: 80, reps: 8 },
    { id: "l2", dateISO: daysAgoISO(20), lift: "Bench Press", weightKg: 85, reps: 7 },
    { id: "l3", dateISO: daysAgoISO(14), lift: "Bench Press", weightKg: 90, reps: 6 },
    { id: "l4", dateISO: daysAgoISO(9), lift: "Bench Press", weightKg: 87.5, reps: 8 },
    { id: "l5", dateISO: daysAgoISO(4), lift: "Bench Press", weightKg: 92.5, reps: 5 },

    { id: "s1", dateISO: daysAgoISO(24), lift: "Back Squat", weightKg: 110, reps: 6 },
    { id: "s2", dateISO: daysAgoISO(17), lift: "Back Squat", weightKg: 115, reps: 5 },
    { id: "s3", dateISO: daysAgoISO(10), lift: "Back Squat", weightKg: 120, reps: 5 },
    { id: "s4", dateISO: daysAgoISO(3), lift: "Back Squat", weightKg: 122.5, reps: 4 },

    { id: "d1", dateISO: daysAgoISO(22), lift: "Deadlift", weightKg: 150, reps: 5 },
    { id: "d2", dateISO: daysAgoISO(15), lift: "Deadlift", weightKg: 155, reps: 4 },
    { id: "d3", dateISO: daysAgoISO(8), lift: "Deadlift", weightKg: 160, reps: 4 },
    { id: "d4", dateISO: daysAgoISO(1), lift: "Deadlift", weightKg: 162.5, reps: 3 },
  ];

  const cardio: CardioEntry[] = [
    { id: "c1", dateISO: daysAgoISO(25), machine: "Assault Bike", seconds: 60, calories: 16 },
    { id: "c2", dateISO: daysAgoISO(18), machine: "Assault Bike", seconds: 60, calories: 17 },
    { id: "c3", dateISO: daysAgoISO(12), machine: "Assault Bike", seconds: 60, calories: 18 },
    { id: "c4", dateISO: daysAgoISO(6), machine: "Assault Bike", seconds: 60, calories: 19 },
    { id: "c5", dateISO: daysAgoISO(2), machine: "Assault Bike", seconds: 60, calories: 20 },

    { id: "r1", dateISO: daysAgoISO(23), machine: "RowErg", seconds: 60, calories: 14 },
    { id: "r2", dateISO: daysAgoISO(16), machine: "RowErg", seconds: 60, calories: 15 },
    { id: "r3", dateISO: daysAgoISO(9), machine: "RowErg", seconds: 60, calories: 16 },
    { id: "r4", dateISO: daysAgoISO(4), machine: "RowErg", seconds: 60, calories: 17 },
  ];

  const runs: RunEntry[] = [
    { id: "run1", dateISO: daysAgoISO(21), distanceMeters: 800, inputType: "TIME", timeSeconds: 235, rounds: 1 },
    { id: "run2", dateISO: daysAgoISO(13), distanceMeters: 800, inputType: "TIME", timeSeconds: 228, rounds: 1 },
    { id: "run3", dateISO: daysAgoISO(7), distanceMeters: 800, inputType: "TIME", timeSeconds: 223, rounds: 1 },
    { id: "run4", dateISO: daysAgoISO(0), distanceMeters: 800, inputType: "PACE", paceSecPerKm: 270, rounds: 2 },
  ];

  const imported: ImportedWorkout[] = [
    { id: "i1", dateISO: daysAgoISO(27), source: "Apple Health", workoutType: "Strength", minutes: 42, activeCalories: 380 },
    { id: "i2", dateISO: daysAgoISO(21), source: "Apple Health", workoutType: "Cardio", minutes: 28, activeCalories: 290 },
    { id: "i3", dateISO: daysAgoISO(16), source: "Apple Health", workoutType: "Strength", minutes: 46, activeCalories: 410 },
    { id: "i4", dateISO: daysAgoISO(11), source: "Apple Health", workoutType: "Run", minutes: 24, activeCalories: 260, distanceKm: 3.4 },
    { id: "i5", dateISO: daysAgoISO(7), source: "Apple Health", workoutType: "Strength", minutes: 39, activeCalories: 360 },
    { id: "i6", dateISO: daysAgoISO(2), source: "Apple Health", workoutType: "Cardio", minutes: 31, activeCalories: 310 },
  ];

  const health: HealthMetric[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const iso = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    const sleepHours = 6.5 + Math.random() * 2;
    
    // Generate sleep stages data for the latest 7 days
    let sleepStages: SleepStageData[] | undefined;
    if (i < 7) {
      sleepStages = generateSleepStages(sleepHours);
    }
    
    health.push({
      dateISO: iso,
      steps: Math.floor(6000 + Math.random() * 4000),
      sleepHours,
      sleepStages,
      avgBPM: Math.floor(65 + Math.random() * 30),
      caloriesBurned: Math.floor(1800 + Math.random() * 400),
      activeMinutes: Math.floor(30 + Math.random() * 60),
    });
  }

  return { focus, lifts, cardio, runs, imported, health };
}

// Helper function to generate sleep stages data
function generateSleepStages(totalHours: number): SleepStageData[] {
  const stages: SleepStageData[] = [];
  const startHour = 22; // 10 PM
  const startMinute = 0;
  const totalMinutes = totalHours * 60;
  const intervalMinutes = 30; // 30-minute intervals
  
  let currentMinute = 0;
  const bedtime = startHour * 60 + startMinute;
  
  while (currentMinute < totalMinutes) {
    const hour = Math.floor((bedtime + currentMinute) / 60) % 24;
    const minute = (bedtime + currentMinute) % 60;
    const timeStr = `${pad2(hour)}:${pad2(minute)}`;
    
    // Simulate sleep stages pattern
    let stage: SleepStage;
    const progress = currentMinute / totalMinutes;
    
    if (progress < 0.02) {
      stage = "Awake"; // Initial wake period
    } else if (progress < 0.15) {
      stage = "Core"; // Light sleep start
    } else if (progress < 0.25) {
      stage = "Deep"; // Deep sleep period
    } else if (progress < 0.35) {
      stage = "Core";
    } else if (progress < 0.45) {
      stage = "REM";
    } else if (progress < 0.55) {
      stage = "Core";
    } else if (progress < 0.65) {
      stage = "Deep";
    } else if (progress < 0.75) {
      stage = "Core";
    } else if (progress < 0.85) {
      stage = "REM";
    } else if (progress < 0.95) {
      stage = "Core";
    } else {
      stage = "Awake"; // Waking up
    }
    
    stages.push({ time: timeStr, stage });
    currentMinute += intervalMinutes;
  }
  
  return stages;
}

function calcLiftedTonnage(lifts: LiftEntry[]) {
  // Heuristic: top set only, so tonnage is limited. Still gives a motivating trend.
  // If later you add sets, replace this.
  const totalKg = sum(lifts, (l) => l.weightKg * l.reps);
  return kgToTonnage(totalKg);
}

function calcHeaviest(lifts: LiftEntry[]) {
  return lifts.reduce((max, l) => Math.max(max, l.weightKg), 0);
}

function buildOverviewSeries(params: {
  rangeDays: number;
  lifts: LiftEntry[];
  cardio: CardioEntry[];
  runs: RunEntry[];
  imported: ImportedWorkout[];
}) {
  const { rangeDays, lifts, cardio, runs, imported } = params;
  const start = isoToDate(daysAgoISO(rangeDays));
  const end = new Date();

  const byDay = new Map<string, { dateISO: string; workouts: number }>();
  const add = (dateISO: string) => {
    if (isoToDate(dateISO) < start || isoToDate(dateISO) > end) return;
    const row = byDay.get(dateISO) ?? { dateISO, workouts: 0 };
    row.workouts += 1;
    byDay.set(dateISO, row);
  };

  // Workouts count = wearable imported sessions + manual journal entries
  for (const w of imported) add(w.dateISO);
  for (const l of lifts) add(l.dateISO);
  for (const c of cardio) add(c.dateISO);
  for (const r of runs) add(r.dateISO);

  // Fill gaps
  const series: Array<{ dateISO: string; workouts: number }> = [];
  const d = new Date(start);
  while (d <= end) {
    const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    series.push(byDay.get(iso) ?? { dateISO: iso, workouts: 0 });
    d.setDate(d.getDate() + 1);
  }

  // Cumulative curve like the screenshot (smooth rising)
  let cum = 0;
  return series.map((x) => {
    cum += x.workouts;
    return { dateISO: x.dateISO, value: cum };
  });
}

function normalizeRunPace(entry: RunEntry): number | null {
  if (entry.inputType === "TIME") {
    if (!entry.timeSeconds) return null;
    return entry.timeSeconds / (entry.distanceMeters / 1000);
  }
  if (typeof entry.paceSecPerKm === "number") return entry.paceSecPerKm;
  return null;
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" 
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6"
        style={{ background: CARD2, border: `1px solid ${BORDER}`, boxShadow: "0 -4px 24px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="text-lg font-semibold" style={{ color: TEXT }}>
            {title}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ background: "rgba(255,255,255,0.05)", color: TEXT, border: `1px solid ${BORDER}` }}
          >
            Close
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

function BottomTab({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-1.5 py-3 flex-1 transition-all duration-200 active:scale-95"
      style={{ color: active ? TEXT : "rgba(255,255,255,0.5)" }}
    >
      <div
        className="transition-all duration-200"
        style={
          active
            ? { 
                transform: "scale(1.1)",
                filter: "drop-shadow(0 2px 4px rgba(0,0,255,0.4))"
              }
            : { 
                transform: "scale(1)",
                opacity: 0.6
              }
        }
      >
        {icon}
      </div>
      <div 
        className="text-[10px] font-medium transition-all duration-200" 
        style={{ 
          color: active ? TEXT : "rgba(255,255,255,0.5)",
          opacity: active ? 1 : 0.7
        }}
      >
        {label}
      </div>
      {active && (
        <div 
          className="absolute bottom-0 w-8 h-0.5 rounded-full transition-all duration-200"
          style={{ background: ACCENT }}
        />
      )}
    </button>
  );
}

// PrimaryButton is now imported from components

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
}) {
  return (
    <label className="block">
      <div className="text-xs mb-2 font-medium" style={{ color: MUTED }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:ring-2"
        style={{ 
          background: "rgba(255,255,255,0.05)", 
          border: `1px solid ${BORDER}`, 
          color: TEXT,
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "rgba(0,0,255,0.5)";
          e.target.style.boxShadow = "0 0 0 2px rgba(0,0,255,0.15)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = BORDER;
          e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
        }}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <div className="text-xs mb-2 font-medium" style={{ color: MUTED }}>
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:ring-2"
        style={{ 
          background: "rgba(255,255,255,0.05)", 
          border: `1px solid ${BORDER}`, 
          color: TEXT,
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "rgba(0,0,255,0.5)";
          e.target.style.boxShadow = "0 0 0 2px rgba(0,0,255,0.15)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = BORDER;
          e.target.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
        }}
      >
        {options.map((o) => (
          <option key={o} value={o} style={{ background: BG, color: TEXT }}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Divider() {
  return <div className="h-px my-4" style={{ background: BORDER }} />;
}

function HistoryRow({
  title,
  subtitle,
  right,
  onClick,
}: {
  title: string;
  subtitle: string;
  right: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={classNames("w-full text-left rounded-xl px-4 py-3 transition-all duration-200", onClick ? "hover:opacity-90 active:scale-[0.98]" : "")}
      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold" style={{ color: TEXT }}>
            {title}
          </div>
          <div className="text-xs mt-0.5" style={{ color: MUTED }}>
            {subtitle}
          </div>
        </div>
        <div className="text-sm font-medium" style={{ color: TEXT }}>
          {right}
        </div>
      </div>
    </button>
  );
}

function GroupedLiftRow({
  liftType,
  entries,
  isExpanded,
  onToggle,
  onSelectLift,
}: {
  liftType: LiftType;
  entries: LiftEntry[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelectLift: () => void;
}) {
  const sortedEntries = [...entries].sort((a, b) => isoToDate(b.dateISO).getTime() - isoToDate(a.dateISO).getTime());
  const latest = sortedEntries[0];
  const count = entries.length;
  
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 transition-all duration-200 hover:opacity-90 active:scale-[0.98] flex items-center justify-between"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold" style={{ color: TEXT }}>
              {liftType}
            </div>
            <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,255,0.15)", color: "rgba(0,0,255,0.9)" }}>
              {count}
            </div>
          </div>
          {latest && (
            <div className="text-xs mt-1" style={{ color: MUTED }}>
              Latest: {formatDateShort(latest.dateISO)} • {latest.weightKg} kg × {latest.reps}{latest.rpe ? ` · RPE ${latest.rpe}` : ""}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectLift();
            }}
            className="text-xs px-3 py-1.5 rounded-lg transition-all duration-200 hover:opacity-90"
            style={{ background: "rgba(0,0,255,0.15)", border: `1px solid rgba(0,0,255,0.3)`, color: TEXT }}
          >
            View Progress
          </button>
          <svg
            className="w-5 h-5 transition-transform duration-200"
            style={{ color: MUTED, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      {isExpanded && (
        <div className="border-t" style={{ borderColor: BORDER }}>
          <div className="px-4 py-2 space-y-2">
            {sortedEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div>
                  <div className="text-xs font-medium" style={{ color: TEXT }}>
                    {formatDateShort(entry.dateISO)}
                  </div>
                </div>
                <div className="text-xs font-semibold" style={{ color: TEXT }}>
                  {entry.weightKg} kg × {entry.reps}{entry.rpe ? ` · RPE ${entry.rpe}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupedCardioRow({
  machine,
  entries,
  isExpanded,
  onToggle,
  onSelectMachine,
}: {
  machine: CardioMachine;
  entries: CardioEntry[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelectMachine: () => void;
}) {
  const sortedEntries = [...entries].sort((a, b) => isoToDate(b.dateISO).getTime() - isoToDate(a.dateISO).getTime());
  const latest = sortedEntries[0];
  const count = entries.length;
  
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 transition-all duration-200 hover:opacity-90 active:scale-[0.98] flex items-center justify-between"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold" style={{ color: TEXT }}>
              {machine}
            </div>
            <div className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,0,255,0.15)", color: "rgba(0,0,255,0.9)" }}>
              {count}
            </div>
          </div>
          {latest && (
            <div className="text-xs mt-1" style={{ color: MUTED }}>
              Latest: {formatDateShort(latest.dateISO)} • {latest.calories} cal ({latest.seconds}s)
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectMachine();
            }}
            className="text-xs px-3 py-1.5 rounded-lg transition-all duration-200 hover:opacity-90"
            style={{ background: "rgba(0,0,255,0.15)", border: `1px solid rgba(0,0,255,0.3)`, color: TEXT }}
          >
            View Progress
          </button>
          <svg
            className="w-5 h-5 transition-transform duration-200"
            style={{ color: MUTED, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      {isExpanded && (
        <div className="border-t" style={{ borderColor: BORDER }}>
          <div className="px-4 py-2 space-y-2">
            {sortedEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div>
                  <div className="text-xs font-medium" style={{ color: TEXT }}>
                    {formatDateShort(entry.dateISO)} • {entry.seconds}s
                  </div>
                </div>
                <div className="text-xs font-semibold" style={{ color: TEXT }}>
                  {entry.calories} cal
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const sample = useMemo(() => buildSampleData(), []);

  const [authed, setAuthed] = useState<boolean>(true);
  const [tab, setTab] = useState<AppTab>("Overview");
  const [focus, setFocus] = useState<TrainingFocus>(sample.focus);
  const [range, setRange] = useState<DateRange>("90");

  const [lifts, setLifts] = useState<LiftEntry[]>(sample.lifts);
  const [cardio, setCardio] = useState<CardioEntry[]>(sample.cardio);
  const [runs, setRuns] = useState<RunEntry[]>(sample.runs);
  const [imported, setImported] = useState<ImportedWorkout[]>(sample.imported);
  const [healthData, setHealthData] = useState<HealthMetric[]>(sample.health);
  const [healthPeriod, setHealthPeriod] = useState<HealthPeriod>("Daily");

  const [journalTab, setJournalTab] = useState<JournalTab>("All");
  const [progressFilter, setProgressFilter] = useState<JournalTab>("Lifts");
  const [expandedLiftGroups, setExpandedLiftGroups] = useState<Set<LiftType>>(new Set());
  const [expandedCardioGroups, setExpandedCardioGroups] = useState<Set<CardioMachine>>(new Set());

  const [selectedLift, setSelectedLift] = useState<LiftType>("Bench Press");
  const [selectedMachine, setSelectedMachine] = useState<CardioMachine>("Assault Bike");
  const [selectedRunDistance, setSelectedRunDistance] = useState<number>(800);
  const [liftMetric, setLiftMetric] = useState<"e1RM" | "Weight" | "Reps" | "RPE">("e1RM");
  const [progressTimeRange, setProgressTimeRange] = useState<"Week" | "Month" | "All-time">("All-time");

  const [modal, setModal] = useState<null | { type: "ADD" | "LIFT" | "CARDIO" | "RUN" }>(null);

  // --- Auth (mock)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- Lift entry form
  const [liftWeight, setLiftWeight] = useState("");
  const [liftReps, setLiftReps] = useState("");
  const [liftRPE, setLiftRPE] = useState<number | null>(null);
  const [showRPEInfo, setShowRPEInfo] = useState(false);

  // --- Cardio form
  const [cardioCalories, setCardioCalories] = useState("");
  const [cardioSeconds, setCardioSeconds] = useState("60");

  // --- Run form
  const [runDistance, setRunDistance] = useState("800");
  const [runRounds, setRunRounds] = useState("1");
  const [runInputType, setRunInputType] = useState<"TIME" | "PACE">("TIME");
  const [runTime, setRunTime] = useState("3:45");
  const [runPace, setRunPace] = useState("4:45");

  useEffect(() => {
    // Prefill lift form from selected
    const last = lifts
      .filter((l) => l.lift === selectedLift)
      .sort((a, b) => isoToDate(b.dateISO).getTime() - isoToDate(a.dateISO).getTime())[0];
    if (last) {
      setLiftWeight(String(last.weightKg));
      setLiftReps(String(last.reps));
      setLiftRPE(last.rpe ?? null);
    } else {
      setLiftWeight("");
      setLiftReps("");
      setLiftRPE(null);
    }
  }, [selectedLift]);

  useEffect(() => {
    // Prefill cardio
    const last = cardio
      .filter((c) => c.machine === selectedMachine)
      .sort((a, b) => isoToDate(b.dateISO).getTime() - isoToDate(a.dateISO).getTime())[0];
    if (last) {
      setCardioCalories(String(last.calories));
      setCardioSeconds(String(last.seconds));
    } else {
      setCardioCalories("");
      setCardioSeconds("60");
    }
  }, [selectedMachine]);

  useEffect(() => {
    setRunDistance(String(selectedRunDistance));
  }, [selectedRunDistance]);

  const rangeDays = useMemo(() => {
    if (range === "30") return 30;
    if (range === "90") return 90;
    return 365;
  }, [range]);

  const overviewSeries = useMemo(
    () =>
      buildOverviewSeries({
        rangeDays,
        lifts,
        cardio,
        runs,
        imported,
      }),
    [rangeDays, lifts, cardio, runs, imported]
  );

  const stats = useMemo(() => {
    const liftsInRange = lifts.filter((x) => withinLastDays(x.dateISO, rangeDays));
    const cardioInRange = cardio.filter((x) => withinLastDays(x.dateISO, rangeDays));
    const runsInRange = runs.filter((x) => withinLastDays(x.dateISO, rangeDays));
    const importedInRange = imported.filter((x) => withinLastDays(x.dateISO, rangeDays));

    const workouts = liftsInRange.length + cardioInRange.length + runsInRange.length + importedInRange.length;
    const liftedTons = calcLiftedTonnage(liftsInRange);
    const reps = sum(liftsInRange, (l) => l.reps);
    const heaviest = calcHeaviest(liftsInRange);
    const minutes = sum(importedInRange, (w) => w.minutes);
    const activeCals = sum(importedInRange, (w) => w.activeCalories ?? 0);

    return {
      workouts,
      liftedTons,
      reps,
      heaviest,
      timeHrs: minutes / 60,
      activeCals,
    };
  }, [lifts, cardio, runs, imported, rangeDays]);

  const groupedLifts = useMemo(() => {
    const groups = new Map<LiftType, LiftEntry[]>();
    for (const l of lifts) {
      const existing = groups.get(l.lift) ?? [];
      existing.push(l);
      groups.set(l.lift, existing);
    }
    return groups;
  }, [lifts]);

  const groupedCardio = useMemo(() => {
    const groups = new Map<CardioMachine, CardioEntry[]>();
    for (const c of cardio) {
      const existing = groups.get(c.machine) ?? [];
      existing.push(c);
      groups.set(c.machine, existing);
    }
    return groups;
  }, [cardio]);

  const journalItems = useMemo(() => {
    const items: Array<
      | { type: "lift"; dateISO: string; title: string; subtitle: string; right: string; key: string; onClick: () => void }
      | { type: "cardio"; dateISO: string; title: string; subtitle: string; right: string; key: string; onClick: () => void }
      | { type: "run"; dateISO: string; title: string; subtitle: string; right: string; key: string; onClick: () => void }
      | { type: "import"; dateISO: string; title: string; subtitle: string; right: string; key: string }
    > = [];

    // Only add individual lift items if not showing lifts tab (for All tab)
    if (journalTab !== "Lifts") {
    for (const l of lifts) {
        const rpeText = l.rpe ? ` · RPE ${l.rpe}` : "";
      items.push({
        type: "lift",
        dateISO: l.dateISO,
        title: l.lift,
        subtitle: formatDateShort(l.dateISO),
          right: `${l.weightKg} kg × ${l.reps}${rpeText}`,
        key: `lift-${l.id}`,
        onClick: () => {
          setSelectedLift(l.lift);
          setTab("Progress");
          setProgressFilter("Lifts");
        },
      });
      }
    }

    // Only add individual cardio items if not showing cardio tab (for All tab)
    if (journalTab !== "Cardio") {
    for (const c of cardio) {
      items.push({
        type: "cardio",
        dateISO: c.dateISO,
        title: c.machine,
        subtitle: `${formatDateShort(c.dateISO)} • ${c.seconds}s`,
        right: `${c.calories} cal`,
        key: `cardio-${c.id}`,
        onClick: () => {
          setSelectedMachine(c.machine);
          setTab("Progress");
          setProgressFilter("Cardio");
        },
      });
      }
    }

    for (const r of runs) {
      const pace = normalizeRunPace(r);
      const distKm = r.distanceMeters / 1000;
      items.push({
        type: "run",
        dateISO: r.dateISO,
        title: "Run",
        subtitle: `${formatDateShort(r.dateISO)} • ${r.distanceMeters}m • ${r.rounds} round${r.rounds === 1 ? "" : "s"}`,
        right: pace ? formatPace(pace) : `${distKm.toFixed(1)}km`,
        key: `run-${r.id}`,
        onClick: () => {
          setSelectedRunDistance(r.distanceMeters);
          setTab("Progress");
          setProgressFilter("Running");
        },
      });
    }

    for (const w of imported) {
      items.push({
        type: "import",
        dateISO: w.dateISO,
        title: `${w.workoutType} (import)` ,
        subtitle: `${formatDateShort(w.dateISO)} • ${w.source}`,
        right: `${w.minutes} min`,
        key: `imp-${w.id}`,
      });
    }

    items.sort((a, b) => isoToDate(b.dateISO).getTime() - isoToDate(a.dateISO).getTime());

    const filtered = items.filter((it) => {
      if (journalTab === "All") return true;
      if (journalTab === "Lifts") return false; // Handled separately with grouped view
      if (journalTab === "Cardio") return false; // Handled separately with grouped view
      return it.type === "run";
    });

    return filtered;
  }, [lifts, cardio, runs, imported, journalTab]);

  const liftSeries = useMemo(() => {
    const rangeDays = progressTimeRange === "Week" ? 7 : progressTimeRange === "Month" ? 30 : 9999;
    const filtered = lifts
      .filter((l) => l.lift === selectedLift)
      .filter((l) => progressTimeRange === "All-time" || withinLastDays(l.dateISO, rangeDays))
      .slice()
      .sort((a, b) => isoToDate(a.dateISO).getTime() - isoToDate(b.dateISO).getTime());

    return filtered.map((l) => {
      let value: number;
      if (liftMetric === "e1RM") {
        value = Math.round(e1rm(l.weightKg, l.reps) * 10) / 10;
      } else if (liftMetric === "Weight") {
        value = l.weightKg;
      } else if (liftMetric === "Reps") {
        value = l.reps;
      } else {
        // RPE
        value = l.rpe ?? 0;
      }

      return {
        dateISO: l.dateISO,
        value,
        weightKg: l.weightKg,
        reps: l.reps,
        rpe: l.rpe,
      };
    }).filter((row) => {
      // Filter out RPE entries with no RPE value
      if (liftMetric === "RPE" && !row.rpe) return false;
      return true;
    });
  }, [lifts, selectedLift, liftMetric, progressTimeRange]);

  const hasEnoughRPE = useMemo(() => {
    const rpeCount = lifts
      .filter((l) => l.lift === selectedLift && l.rpe !== undefined)
      .length;
    return rpeCount >= 3;
  }, [lifts, selectedLift]);

  const cardioSeries = useMemo(() => {
    const rangeDays = progressTimeRange === "Week" ? 7 : progressTimeRange === "Month" ? 30 : 9999;
    const rows = cardio
      .filter((c) => c.machine === selectedMachine)
      .filter((c) => progressTimeRange === "All-time" || withinLastDays(c.dateISO, rangeDays))
      .slice()
      .sort((a, b) => isoToDate(a.dateISO).getTime() - isoToDate(b.dateISO).getTime())
      .map((c) => ({
        dateISO: c.dateISO,
        value: c.calories,
        seconds: c.seconds,
      }));
    return rows;
  }, [cardio, selectedMachine, progressTimeRange]);

  const runSeries = useMemo(() => {
    const rangeDays = progressTimeRange === "Week" ? 7 : progressTimeRange === "Month" ? 30 : 9999;
    const rows = runs
      .filter((r) => r.distanceMeters === selectedRunDistance)
      .filter((r) => progressTimeRange === "All-time" || withinLastDays(r.dateISO, rangeDays))
      .slice()
      .sort((a, b) => isoToDate(a.dateISO).getTime() - isoToDate(b.dateISO).getTime())
      .map((r) => ({
        dateISO: r.dateISO,
        value: normalizeRunPace(r) ?? 0,
        rounds: r.rounds,
      }))
      .filter((x) => x.value > 0);
    return rows;
  }, [runs, selectedRunDistance, progressTimeRange]);

  const progressBreadcrumb = useMemo(() => {
    if (progressFilter === "Lifts") return `Progress → ${selectedLift}`;
    if (progressFilter === "Cardio") return `Progress → ${selectedMachine}`;
    return `Progress → Running (${selectedRunDistance}m)`;
  }, [progressFilter, selectedLift, selectedMachine, selectedRunDistance]);

  const openAdd = () => setModal({ type: "ADD" });

  function addLift() {
    const w = Number(liftWeight);
    const r = Number(liftReps);
    if (!Number.isFinite(w) || w <= 0) return;
    if (!Number.isFinite(r) || r <= 0) return;
    const entry: LiftEntry = {
      id: `l_${crypto.randomUUID()}`,
      dateISO: todayISO(),
      lift: selectedLift,
      weightKg: Math.round((w / 2.5)) * 2.5,
      reps: Math.floor(r),
      ...(liftRPE !== null && liftRPE >= 1 && liftRPE <= 10 ? { rpe: liftRPE } : {}),
    };
    setLifts((prev) => [entry, ...prev]);
    setModal(null);
  }

  function addCardio() {
    const cal = Number(cardioCalories);
    const sec = Number(cardioSeconds);
    if (!Number.isFinite(cal) || cal <= 0) return;
    if (!Number.isFinite(sec) || sec <= 0) return;
    const entry: CardioEntry = {
      id: `c_${crypto.randomUUID()}`,
      dateISO: todayISO(),
      machine: selectedMachine,
      seconds: Math.floor(sec),
      calories: Math.floor(cal),
    };
    setCardio((prev) => [entry, ...prev]);
    setModal(null);
  }

  function addRun() {
    const dist = Number(runDistance);
    const rounds = clamp(Number(runRounds), 1, 99);
    if (!Number.isFinite(dist) || dist <= 0) return;

    let paceSec: number | null = null;
    let timeSec: number | null = null;

    if (runInputType === "TIME") {
      const parsed = parseTimeToSeconds(runTime);
      if (parsed == null) return;
      timeSec = parsed;
      paceSec = parsed / (dist / 1000);
    } else {
      const parsed = parsePaceToSecPerKm(runPace);
      if (parsed == null) return;
      paceSec = parsed;
      timeSec = Math.round(parsed * (dist / 1000));
    }

    const entry: RunEntry = {
      id: `r_${crypto.randomUUID()}`,
      dateISO: todayISO(),
      distanceMeters: Math.round(dist),
      inputType: runInputType,
      rounds: Math.floor(rounds),
      timeSeconds: timeSec ?? undefined,
      paceSecPerKm: paceSec ?? undefined,
    };

    setRuns((prev) => [entry, ...prev]);
    setModal(null);
  }

  function ConnectRow({
    title,
    subtitle,
    enabled,
    onToggle,
  }: {
    title: string;
    subtitle: string;
    enabled: boolean;
    onToggle: () => void;
  }) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 transition-all duration-200" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
        <div>
          <div className="text-sm font-semibold" style={{ color: TEXT }}>
            {title}
          </div>
          <div className="text-xs mt-0.5" style={{ color: MUTED }}>
            {subtitle}
          </div>
        </div>
        <button
          onClick={onToggle}
          className="w-12 h-7 rounded-full p-1 transition-all duration-200 active:scale-95"
          style={{
            background: enabled ? ACCENT : "rgba(255,255,255,0.1)",
            border: enabled ? `1px solid rgba(0,0,255,0.6)` : `1px solid ${BORDER}`,
            boxShadow: enabled ? "0 2px 6px rgba(0,0,255,0.3)" : "none",
          }}
        >
          <div
            className="w-5 h-5 rounded-full transition-all duration-200"
            style={{
              background: TEXT,
              transform: enabled ? "translateX(20px)" : "translateX(0px)",
            }}
          />
        </button>
      </div>
    );
  }

  // --- mock integration toggles
  const [appleHealth, setAppleHealth] = useState(true);
  const [healthConnect, setHealthConnect] = useState(false);

  // --- AUTH UI
  if (!authed) {
    return (
      <div className="min-h-screen" style={{ background: BG, color: TEXT }}>
        <div className="mx-auto max-w-md px-5 pt-16 pb-28">
          <div className="text-3xl font-bold">Hybrid House</div>
          <div className="mt-2" style={{ color: MUTED }}>
            Journal + Progress
          </div>

          <div className="mt-10 space-y-4">
            <Input label="Email" value={email} onChange={setEmail} placeholder="you@email.com" />
            <Input label="Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />
            <PrimaryButton onClick={() => setAuthed(true)} disabled={!email || !password}>
              Login
            </PrimaryButton>
            <button
              className="w-full rounded-2xl py-3"
              style={{ border: `1px solid ${BORDER}`, color: TEXT }}
              onClick={() => setAuthed(true)}
            >
              Create account
            </button>
          </div>

          <div className="mt-10 text-xs" style={{ color: MUTED }}>
            By continuing, you agree to the Terms & Privacy.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT }}>
      <div className="mx-auto max-w-md px-[20px] pt-[50px] pb-[50px]">
        {/* Premium Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
          <div className="flex items-center gap-2">
              <div className="text-xl font-semibold" style={typography.title}>Hybrid House</div>
            <Badge>{focus}</Badge>
          </div>
            <div className="text-xs mt-1" style={{ color: MUTED }}>
              {tab}
            </div>
          </div>
          <IconButton onClick={() => setAuthed(false)} size="sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </IconButton>
        </header>

        <div className="mt-5">
          {tab === "Overview" ? (
            <div className="space-y-5">
              {/* Header with Date Range */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-semibold mb-1" style={typography.title}>Overview</div>
                  <div className="text-xs" style={{ color: MUTED }}>
                    Track workouts + journal entries
                  </div>
                </div>
                <SegmentedControl
                  value={range}
                  setValue={setRange}
                  options={[
                    { label: "30d", value: "30" },
                    { label: "90d", value: "90" },
                    { label: "Year", value: "365" },
                  ]}
                />
              </div>

              {/* Workouts Chart - Premium Glass Card */}
              <GlassCard glow>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base font-semibold" style={typography.sectionTitle}>Workouts</div>
                  <div className="text-xs" style={{ color: MUTED }}>{`Last ${rangeDays} days`}</div>
                </div>
                <div className="h-48" style={{ width: "100%" }}>
                  <ResponsiveContainer width="100%" height={192}>
                    <AreaChart data={overviewSeries} margin={{ left: 8, right: 8, top: 12, bottom: 4 }}>
                      <defs>
                        <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={colors.accent} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis
                        dataKey="dateISO"
                        tickFormatter={(v) => formatDateShort(v)}
                        tick={{ fill: colors.muted, fontSize: 11 }}
                        axisLine={{ stroke: colors.border }}
                        tickLine={false}
                        minTickGap={20}
                      />
                      <YAxis
                        tick={{ fill: colors.muted, fontSize: 11 }}
                        axisLine={{ stroke: colors.border }}
                        tickLine={false}
                        width={32}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(10,10,14,0.95)",
                          border: `1px solid ${colors.border}`,
                          borderRadius: radii.lg,
                          color: colors.text,
                          backdropFilter: "blur(12px)",
                        }}
                        labelStyle={{ color: colors.muted, fontSize: 11 }}
                        formatter={(val: any) => [val, "Workouts"]}
                        labelFormatter={(label: any) => label}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={colors.accent}
                        strokeWidth={2.5}
                        fill="url(#area)"
                        style={{ filter: `drop-shadow(0 2px 4px ${colors.accentGlow})` }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="Workouts" value={`${stats.workouts}`} />
                <StatTile label="Lifted" value={`${stats.liftedTons.toFixed(1)} t`} />
                <StatTile label="Reps" value={`${stats.reps}`} />
                <StatTile label="Heaviest" value={`${stats.heaviest || 0} kg`} />
                <StatTile label="Time" value={`${stats.timeHrs.toFixed(1)} h`} />
                <StatTile label="Active cals" value={`${stats.activeCals}`} />
              </div>

              {/* Quick Add Card */}
              <GlassCard>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-base font-semibold" style={typography.sectionTitle}>Quick add</div>
                  <IconButton onClick={openAdd} size="sm">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </IconButton>
                </div>
                <div className="text-sm" style={{ color: MUTED }}>
                  Log a lift top set, a 60s max calories effort, or a run distance.
                </div>
              </GlassCard>
            </div>
          ) : null}

          {tab === "Journal" ? (
            <div className="space-y-5">
              {/* Premium Header */}
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-semibold mb-1" style={typography.title}>Journal</div>
                  <div className="text-xs" style={{ color: MUTED }}>
                    Manual entries + imported workouts
                  </div>
                </div>
                <IconButton onClick={openAdd} size="md" className="!rounded-full">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </IconButton>
              </div>

              {/* SegmentedControl Control */}
              <SegmentedControl
                value={journalTab}
                setValue={setJournalTab}
                options={[
                  { label: "All", value: "All" },
                  { label: "Lifts", value: "Lifts" },
                  { label: "Cardio", value: "Cardio" },
                  { label: "Running", value: "Running" },
                ]}
              />

              <div className="space-y-3">
                {journalTab === "Lifts" ? (
                  // Grouped lifts view
                  Array.from(groupedLifts.entries())
                    .sort((a, b) => {
                      const aLatest = [...a[1]].sort((x, y) => isoToDate(y.dateISO).getTime() - isoToDate(x.dateISO).getTime())[0];
                      const bLatest = [...b[1]].sort((x, y) => isoToDate(y.dateISO).getTime() - isoToDate(x.dateISO).getTime())[0];
                      return isoToDate(bLatest.dateISO).getTime() - isoToDate(aLatest.dateISO).getTime();
                    })
                    .map(([liftType, entries]) => (
                      <GroupedLiftRow
                        key={liftType}
                        liftType={liftType}
                        entries={entries}
                        isExpanded={expandedLiftGroups.has(liftType)}
                        onToggle={() => {
                          setExpandedLiftGroups((prev) => {
                            const next = new Set(prev);
                            if (next.has(liftType)) {
                              next.delete(liftType);
                            } else {
                              next.add(liftType);
                            }
                            return next;
                          });
                        }}
                        onSelectLift={() => {
                          setSelectedLift(liftType);
                          setTab("Progress");
                          setProgressFilter("Lifts");
                        }}
                      />
                    ))
                ) : journalTab === "Cardio" ? (
                  // Grouped cardio view
                  Array.from(groupedCardio.entries())
                    .sort((a, b) => {
                      const aLatest = [...a[1]].sort((x, y) => isoToDate(y.dateISO).getTime() - isoToDate(x.dateISO).getTime())[0];
                      const bLatest = [...b[1]].sort((x, y) => isoToDate(y.dateISO).getTime() - isoToDate(x.dateISO).getTime())[0];
                      return isoToDate(bLatest.dateISO).getTime() - isoToDate(aLatest.dateISO).getTime();
                    })
                    .map(([machine, entries]) => (
                      <GroupedCardioRow
                        key={machine}
                        machine={machine}
                        entries={entries}
                        isExpanded={expandedCardioGroups.has(machine)}
                        onToggle={() => {
                          setExpandedCardioGroups((prev) => {
                            const next = new Set(prev);
                            if (next.has(machine)) {
                              next.delete(machine);
                            } else {
                              next.add(machine);
                            }
                            return next;
                          });
                        }}
                        onSelectMachine={() => {
                          setSelectedMachine(machine);
                          setTab("Progress");
                          setProgressFilter("Cardio");
                        }}
                      />
                    ))
                ) : (
                  // Regular items view (All, Running)
                  journalItems.slice(0, 18).map((it) => {
                  return (
                    <HistoryRow
                      key={it.key}
                      title={it.title}
                      subtitle={it.subtitle}
                      right={it.right}
                      onClick={(it as any).onClick}
                    />
                  );
                  })
                )}
              </div>

              <div className="text-xs pt-2" style={{ color: MUTED }}>
                Tip: Tap a lift/cardio/run row to open its progress chart.
              </div>
            </div>
          ) : null}

          {tab === "Progress" ? (
            <div className="space-y-4">
              <div>
                <div className="text-xl font-semibold">Progress</div>
                <div className="text-xs mt-1" style={{ color: MUTED }}>
                  {progressBreadcrumb}
                </div>
              </div>

              <SegmentedControl
                value={progressFilter}
                setValue={setProgressFilter}
                options={[
                  { label: "Lifts", value: "Lifts" },
                  { label: "Cardio", value: "Cardio" },
                  { label: "Running", value: "Running" },
                ]}
              />

              {progressFilter === "Lifts" ? (
                <>
                  <Select
                    label="Lift"
                    value={selectedLift}
                    onChange={(v) => {
                      setSelectedLift(v as LiftType);
                      // Reset metric if switching to a lift without enough RPE data
                      if (liftMetric === "RPE") {
                        const newLift = v as LiftType;
                        const rpeCount = lifts.filter((l) => l.lift === newLift && l.rpe !== undefined).length;
                        if (rpeCount < 3) {
                          setLiftMetric("e1RM");
                        }
                      }
                    }}
                    options={["Deadlift", "Back Squat", "Front Squat", "Bench Press", "Incline Bench Press"]}
                  />

                  <SegmentedControl
                    value={liftMetric}
                    setValue={(v) => {
                      const newMetric = v as "e1RM" | "Weight" | "Reps" | "RPE";
                      // If switching to RPE but not enough data, default to e1RM
                      if (newMetric === "RPE" && !hasEnoughRPE) {
                        setLiftMetric("e1RM");
                      } else {
                        setLiftMetric(newMetric);
                      }
                    }}
                    options={[
                      { label: "e1RM", value: "e1RM" },
                      { label: "Weight", value: "Weight" },
                      { label: "Reps", value: "Reps" },
                      ...(hasEnoughRPE ? [{ label: "RPE", value: "RPE" }] : []),
                    ]}
                  />

                  <SegmentedControl
                    value={progressTimeRange}
                    setValue={(v) => setProgressTimeRange(v as "Week" | "Month" | "All-time")}
                    options={[
                      { label: "Week", value: "Week" },
                      { label: "Month", value: "Month" },
                      { label: "All-time", value: "All-time" },
                    ]}
                  />

                  <GlassCard glow>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-base font-semibold" style={typography.sectionTitle}>{selectedLift}</div>
                      <Badge>{liftMetric === "e1RM" ? "e1RM" : liftMetric === "Weight" ? "Weight" : liftMetric === "Reps" ? "Reps" : "RPE"}</Badge>
                    </div>
                    <div className="h-48" style={{ width: "100%" }}>
                      <ResponsiveContainer width="100%" height={192}>
                        {liftMetric === "RPE" ? (
                          <LineChart data={liftSeries} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis
                              dataKey="dateISO"
                              tickFormatter={(v) => formatDateShort(v)}
                              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                              tickLine={false}
                              minTickGap={22}
                            />
                            <YAxis
                              domain={[6, 10]}
                              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                              tickLine={false}
                              width={28}
                            />
                            <Tooltip
                              contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT }}
                              labelStyle={{ color: MUTED }}
                              formatter={(val: any, _name: any, ctx: any) => [
                                `RPE ${val}`,
                                `${ctx?.payload?.weightKg} kg × ${ctx?.payload?.reps}`,
                              ]}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke="rgba(255,255,255,0.4)" 
                              strokeWidth={2} 
                              dot={{ r: 4, fill: ACCENT, strokeWidth: 2, stroke: ACCENT }}
                              activeDot={{ r: 5, fill: ACCENT }}
                            />
                          </LineChart>
                        ) : (
                        <AreaChart data={liftSeries} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="liftArea" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis
                            dataKey="dateISO"
                            tickFormatter={(v) => formatDateShort(v)}
                            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                            tickLine={false}
                            minTickGap={22}
                          />
                          <YAxis
                            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                            tickLine={false}
                            width={34}
                          />
                          <Tooltip
                            contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT }}
                            labelStyle={{ color: MUTED }}
                              formatter={(val: any, _name: any, ctx: any) => {
                                if (liftMetric === "Weight") {
                                  return [`${val} kg`, `${ctx?.payload?.reps} reps${ctx?.payload?.rpe ? ` • RPE ${ctx?.payload?.rpe}` : ""}`];
                                } else if (liftMetric === "Reps") {
                                  return [`${val} reps`, `${ctx?.payload?.weightKg} kg${ctx?.payload?.rpe ? ` • RPE ${ctx?.payload?.rpe}` : ""}`];
                                } else {
                                  return [`${val} kg`, `e1RM  • ${ctx?.payload?.weightKg}×${ctx?.payload?.reps}${ctx?.payload?.rpe ? ` • RPE ${ctx?.payload?.rpe}` : ""}`];
                                }
                              }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke={colors.accent} 
                              strokeWidth={2.5} 
                              fill="url(#liftArea)" 
                              dot={{ r: 3, fill: colors.accent, strokeWidth: 0 }}
                              activeDot={{ r: 5, fill: colors.accent, strokeWidth: 2, stroke: colors.accent }}
                              style={{ filter: `drop-shadow(0 2px 4px ${colors.accentGlow})` }} 
                            />
                        </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>

                  <Card
                    title="Log top set"
                    right={
                      <button
                        onClick={() => setModal({ type: "LIFT" })}
                        className="rounded-xl px-4 py-2 text-xs font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
                        style={{ background: "rgba(0,0,255,0.15)", border: `1px solid rgba(0,0,255,0.35)`, color: TEXT }}
                      >
                        + Add
                      </button>
                    }
                  >
                    <div className="text-sm" style={{ color: MUTED }}>
                      Record your heaviest set for the day.
                    </div>
                  </Card>

                  <div className="space-y-3">
                    {liftSeries
                      .slice()
                      .reverse()
                      .slice(0, 6)
                      .map((x, idx) => (
                        <HistoryRow
                          key={`${x.dateISO}-${idx}`}
                          title={selectedLift}
                          subtitle={formatDateShort(x.dateISO)}
                          right={`${x.weightKg} kg × ${x.reps}${x.rpe ? ` · RPE ${x.rpe}` : ""}`}
                        />
                      ))}
                  </div>
                </>
              ) : null}

              {progressFilter === "Cardio" ? (
                <>
                  <Select
                    label="Machine"
                    value={selectedMachine}
                    onChange={(v) => setSelectedMachine(v as CardioMachine)}
                    options={["RowErg", "BikeErg", "SkiErg", "Assault Bike"]}
                  />

                  <SegmentedControl
                    value={progressTimeRange}
                    setValue={(v) => setProgressTimeRange(v as "Week" | "Month" | "All-time")}
                    options={[
                      { label: "Week", value: "Week" },
                      { label: "Month", value: "Month" },
                      { label: "All-time", value: "All-time" },
                    ]}
                  />

                  <GlassCard glow>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-base font-semibold" style={typography.sectionTitle}>{selectedMachine}</div>
                      <Badge>60s max cals</Badge>
                    </div>
                    <div className="h-48" style={{ width: "100%" }}>
                      <ResponsiveContainer width="100%" height={192}>
                        <AreaChart data={cardioSeries} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="cardioArea" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis
                            dataKey="dateISO"
                            tickFormatter={(v) => formatDateShort(v)}
                            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                            tickLine={false}
                            minTickGap={22}
                          />
                          <YAxis
                            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                            tickLine={false}
                            width={34}
                          />
                          <Tooltip
                            contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT }}
                            labelStyle={{ color: MUTED }}
                            formatter={(val: any, _name: any, ctx: any) => [`${val} cal`, `${ctx?.payload?.seconds ?? 60}s effort`]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke={colors.accent} 
                            strokeWidth={2.5} 
                            fill="url(#cardioArea)" 
                            dot={{ r: 3, fill: colors.accent, strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: colors.accent, strokeWidth: 2, stroke: colors.accent }}
                            style={{ filter: `drop-shadow(0 2px 4px ${colors.accentGlow})` }} 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>

                  <Card
                    title="Log effort"
                    right={
                      <button
                        onClick={() => setModal({ type: "CARDIO" })}
                        className="rounded-xl px-4 py-2 text-xs font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
                        style={{ background: "rgba(0,0,255,0.15)", border: `1px solid rgba(0,0,255,0.35)`, color: TEXT }}
                      >
                        + Add
                      </button>
                    }
                  >
                    <div className="text-sm" style={{ color: MUTED }}>
                      Default is max calories in 60 seconds.
                    </div>
                  </Card>

                  <div className="space-y-3">
                    {cardioSeries
                      .slice()
                      .reverse()
                      .slice(0, 6)
                      .map((x, idx) => (
                        <HistoryRow
                          key={`${x.dateISO}-${idx}`}
                          title={selectedMachine}
                          subtitle={`${formatDateShort(x.dateISO)} • ${x.seconds}s`}
                          right={`${x.value} cal`}
                        />
                      ))}
                  </div>
                </>
              ) : null}

              {progressFilter === "Running" ? (
                <>
                  <Select
                    label="Distance preset"
                    value={String(selectedRunDistance)}
                    onChange={(v) => setSelectedRunDistance(Number(v))}
                    options={["200", "400", "600", "800", "1000"]}
                  />

                  <SegmentedControl
                    value={progressTimeRange}
                    setValue={(v) => setProgressTimeRange(v as "Week" | "Month" | "All-time")}
                    options={[
                      { label: "Week", value: "Week" },
                      { label: "Month", value: "Month" },
                      { label: "All-time", value: "All-time" },
                    ]}
                  />

                  <GlassCard glow>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-base font-semibold" style={typography.sectionTitle}>Running • {selectedRunDistance}m</div>
                      <Badge>pace</Badge>
                    </div>
                    <div className="h-48" style={{ width: "100%" }}>
                      <ResponsiveContainer width="100%" height={192}>
                        <LineChart data={runSeries} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis
                            dataKey="dateISO"
                            tickFormatter={(v) => formatDateShort(v)}
                            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                            tickLine={false}
                            minTickGap={22}
                          />
                          <YAxis
                            tickFormatter={(v) => formatPace(Number(v)).replace("/km", "")}
                            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                            tickLine={false}
                            width={44}
                          />
                          <Tooltip
                            contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT }}
                            labelStyle={{ color: MUTED }}
                            formatter={(val: any, _name: any, ctx: any) => [formatPace(Number(val)), `${ctx?.payload?.rounds ?? 1} rounds`]}
                          />
                        <Line type="monotone" dataKey="value" stroke={colors.accent} strokeWidth={2.5} dot={{ r: 3, fill: colors.accent }} activeDot={{ r: 5, fill: colors.accent }} style={{ filter: `drop-shadow(0 2px 4px ${colors.accentGlow})` }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 text-xs" style={{ color: MUTED }}>
                    Lower pace is better.
                  </div>
                </GlassCard>

                  <Card
                    title="Log run"
                    right={
                      <button
                        onClick={() => setModal({ type: "RUN" })}
                        className="rounded-xl px-4 py-2 text-xs font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
                        style={{ background: "rgba(0,0,255,0.15)", border: `1px solid rgba(0,0,255,0.35)`, color: TEXT }}
                      >
                        + Add
                      </button>
                    }
                  >
                    <div className="text-sm" style={{ color: MUTED }}>
                      Enter distance + time or pace. Add rounds if you did repeats.
                    </div>
                  </Card>

                  <div className="space-y-3">
                    {runs
                      .filter((r) => r.distanceMeters === selectedRunDistance)
                      .slice()
                      .sort((a, b) => isoToDate(b.dateISO).getTime() - isoToDate(a.dateISO).getTime())
                      .slice(0, 6)
                      .map((r) => {
                        const pace = normalizeRunPace(r);
                        return (
                          <HistoryRow
                            key={r.id}
                            title={`Run ${r.distanceMeters}m`}
                            subtitle={`${formatDateShort(r.dateISO)} • ${r.rounds} round${r.rounds === 1 ? "" : "s"}`}
                            right={pace ? formatPace(pace) : "—"}
                          />
                        );
                      })}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {tab === "Health" ? (
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xl font-semibold">Health Metrics</div>
                  <div className="text-xs mt-1" style={{ color: MUTED }}>
                    Watch data synced from Apple Health
                  </div>
                </div>
              </div>

              {/* Period Selector */}
              <div className="flex items-center gap-2">
                {(["Daily", "Weekly", "Monthly"] as HealthPeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setHealthPeriod(period)}
                    className="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200"
                    style={
                      healthPeriod === period
                        ? {
                            background: ACCENT,
                            color: TEXT,
                          }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            color: MUTED,
                          }
                    }
                  >
                    {period}
                  </button>
                ))}
              </div>

              {(() => {
                const filtered = healthData.filter((h) => {
                  const days = healthPeriod === "Daily" ? 1 : healthPeriod === "Weekly" ? 7 : 30;
                  return withinLastDays(h.dateISO, days);
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-8" style={{ color: MUTED }}>
                      No health data available for this period.
                    </div>
                  );
                }

                const latest = filtered[filtered.length - 1];
                const avgSteps = filtered.reduce((sum, h) => sum + h.steps, 0) / filtered.length;
                const avgSleep = filtered.reduce((sum, h) => sum + h.sleepHours, 0) / filtered.length;
                const avgBPM = filtered.reduce((sum, h) => sum + h.avgBPM, 0) / filtered.length;
                const totalCalories = filtered.reduce((sum, h) => sum + h.caloriesBurned, 0);
                const avgCalories = totalCalories / filtered.length;

                const stepsGoal = 10000;
                const sleepGoal = 8;
                const stepsProgress = latest ? Math.min(latest.steps / stepsGoal, 1) : 0;
                const sleepProgress = latest ? Math.min(latest.sleepHours / sleepGoal, 1) : 0;

                return (
                  <>
                    {/* Top Row: Steps, Sleep, Heart - 3 columns */}
                    <div className="grid grid-cols-3 gap-2.5">
                      {/* Steps Card */}
                      <div className="rounded-2xl p-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                        <div className="flex items-center gap-1 mb-2">
                          <svg className="w-1.5 h-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: ACCENT }}>
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                          </svg>
                          <div className="text-[9px] font-medium" style={{ color: MUTED }}>Steps</div>
                        </div>
                        <div className="relative w-14 h-14 mx-auto mb-1.5">
                          <svg className="w-14 h-14 transform -rotate-90">
                            <circle
                              cx="28"
                              cy="28"
                              r="22"
                              fill="none"
                              stroke="rgba(255,255,255,0.08)"
                              strokeWidth="4"
                            />
                            <circle
                              cx="28"
                              cy="28"
                              r="22"
                              fill="none"
                              stroke={ACCENT}
                              strokeWidth="4"
                              strokeDasharray={`${2 * Math.PI * 22}`}
                              strokeDashoffset={`${2 * Math.PI * 22 * (1 - stepsProgress)}`}
                              strokeLinecap="round"
                              style={{ transition: "stroke-dashoffset 0.5s ease" }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="text-xs font-bold leading-tight" style={{ color: TEXT }}>
                              {latest?.steps.toLocaleString() || "0"}
                            </div>
                            <div className="text-[7px] mt-0.5" style={{ color: MUTED }}>
                              {Math.round(stepsProgress * 100)}%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sleep Card */}
                      <div className="rounded-2xl p-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                        <div className="flex items-center gap-1 mb-2">
                          <svg className="w-[50px] h-[35px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: ACCENT }}>
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" style={{ width: "25px", height: "25px" }} />
                          </svg>
                          <div className="text-[9px] font-medium" style={{ color: MUTED }}>Sleep</div>
                        </div>
                        {latest?.sleepStages && latest.sleepStages.length > 0 ? (
                          <div className="h-14 mb-1.5" style={{ width: "100%" }}>
                            <ResponsiveContainer width="100%" height={56}>
                              <AreaChart
                                data={latest.sleepStages.map((s, idx) => ({
                                  index: idx,
                                  time: s.time,
                                  stage: s.stage,
                                  deep: s.stage === "Deep" ? 3 : 0,
                                  core: s.stage === "Core" ? 2 : 0,
                                  rem: s.stage === "REM" ? 1 : 0,
                                  awake: s.stage === "Awake" ? 0.5 : 0,
                                }))}
                                margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                              >
                                <defs>
                                  <linearGradient id="sleepDeep" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#0000FF" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#0000FF" stopOpacity={0.3} />
                                  </linearGradient>
                                  <linearGradient id="sleepCore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#9B59B6" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#9B59B6" stopOpacity={0.3} />
                                  </linearGradient>
                                  <linearGradient id="sleepREM" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#E91E63" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#E91E63" stopOpacity={0.3} />
                                  </linearGradient>
                                  <linearGradient id="sleepAwake" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#FFC107" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#FFC107" stopOpacity={0.3} />
                                  </linearGradient>
                                </defs>
                                <Area
                                  type="stepAfter"
                                  dataKey="deep"
                                  stackId="1"
                                  stroke="#0000FF"
                                  strokeWidth={1}
                                  fill="url(#sleepDeep)"
                                  isAnimationActive={false}
                                />
                                <Area
                                  type="stepAfter"
                                  dataKey="core"
                                  stackId="1"
                                  stroke="#9B59B6"
                                  strokeWidth={1}
                                  fill="url(#sleepCore)"
                                  isAnimationActive={false}
                                />
                                <Area
                                  type="stepAfter"
                                  dataKey="rem"
                                  stackId="1"
                                  stroke="#E91E63"
                                  strokeWidth={1}
                                  fill="url(#sleepREM)"
                                  isAnimationActive={false}
                                />
                                <Area
                                  type="stepAfter"
                                  dataKey="awake"
                                  stackId="1"
                                  stroke="#FFC107"
                                  strokeWidth={1}
                                  fill="url(#sleepAwake)"
                                  isAnimationActive={false}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-14 mb-1.5 flex items-center justify-center text-[8px]" style={{ color: MUTED }}>
                            No sleep data
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-xs font-bold" style={{ color: TEXT }}>
                            {latest?.sleepHours.toFixed(1) || "0.0"}h
                          </div>
                        </div>
                      </div>

                      {/* Heart Rate Card */}
                      <div className="rounded-2xl p-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                        <div className="flex items-center gap-1 mb-2">
                          <svg className="w-[50px] h-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: ACCENT }}>
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                          <div className="text-[9px] font-medium" style={{ color: MUTED }}>Heart</div>
                        </div>
                        <div className="h-14 mb-1.5 flex items-center justify-center overflow-hidden">
                          <svg className="w-full h-full" viewBox="0 0 100 25" preserveAspectRatio="none">
                            <polyline
                              points={filtered.slice(-7).map((h, idx) => {
                                const x = (idx / 6) * 100;
                                const normalizedBPM = Math.max(60, Math.min(100, h.avgBPM));
                                const y = 25 - ((normalizedBPM - 60) / 40) * 25;
                                return `${x},${Math.max(2, Math.min(23, y))}`;
                              }).join(" ")}
                              fill="none"
                              stroke={ACCENT}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-bold" style={{ color: TEXT }}>
                            {latest?.avgBPM || 0} bpm
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid - 2x2 */}
                    <div className="grid grid-cols-2 gap-3">
                      <HealthMetricTile
                        title="Heart Rate"
                        value={String(Math.round(avgBPM))}
                        unit="bpm"
                        icon={
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        }
                        variant="full"
                      />

                      <HealthMetricTile
                        title="Calories"
                        value={String(Math.round(avgCalories))}
                        unit=""
                        icon={
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="6" />
                          </svg>
                        }
                        subLabel={healthPeriod === "Daily" ? "today" : "avg/day"}
                        variant="full"
                      />

                      <HealthMetricTile
                        title="Steps"
                        value={Math.round(avgSteps).toLocaleString()}
                        unit=""
                        icon={
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                          </svg>
                        }
                        subLabel={healthPeriod === "Daily" ? "today" : "avg/day"}
                        variant="full"
                      />

                      <HealthMetricTile
                        title="Active"
                        value={String(Math.round(filtered.reduce((sum, h) => sum + h.activeMinutes, 0) / filtered.length))}
                        unit="minutes"
                        icon={
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        }
                        variant="full"
                      />
                    </div>

                    {/* Charts */}
                    <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-semibold" style={{ color: TEXT }}>Steps Trend</div>
                        <div className="text-xs" style={{ color: MUTED }}>Last 7 days</div>
                      </div>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={filtered.slice(-7)} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                            <defs>
                              <linearGradient id="stepsArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis
                              dataKey="dateISO"
                              tickFormatter={(v) => formatDateShort(v)}
                              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                              tickLine={false}
                              width={40}
                            />
                            <Tooltip
                              contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT }}
                              labelStyle={{ color: MUTED }}
                              formatter={(val: any) => [`${val.toLocaleString()} steps`, ""]}
                            />
                            <Area type="monotone" dataKey="steps" stroke={ACCENT} strokeWidth={2} fill="url(#stepsArea)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-semibold" style={{ color: TEXT }}>Heart Rate</div>
                        <div className="text-xs" style={{ color: MUTED }}>Last 7 days</div>
                      </div>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={filtered.slice(-7)} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis
                              dataKey="dateISO"
                              tickFormatter={(v) => formatDateShort(v)}
                              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                              tickLine={false}
                              width={40}
                            />
                            <Tooltip
                              contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT }}
                              labelStyle={{ color: MUTED }}
                              formatter={(val: any) => [`${val} bpm`, ""]}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="avgBPM" 
                              stroke={ACCENT} 
                              strokeWidth={2} 
                              dot={{ r: 3, fill: ACCENT }}
                              activeDot={{ r: 5, fill: ACCENT }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-semibold" style={{ color: TEXT }}>Sleep Hours</div>
                        <div className="text-xs" style={{ color: MUTED }}>Last 7 days</div>
                      </div>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={filtered.slice(-7)} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis
                              dataKey="dateISO"
                              tickFormatter={(v) => formatDateShort(v)}
                              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                              tickLine={false}
                              width={40}
                            />
                            <Tooltip
                              contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT }}
                              labelStyle={{ color: MUTED }}
                              formatter={(val: any) => [`${val.toFixed(1)}h`, ""]}
                            />
                            <Bar dataKey="sleepHours" fill={ACCENT} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}

          {tab === "Profile" ? (
            <div className="space-y-4">
              <div>
                <div className="text-xl font-semibold">Profile</div>
                <div className="text-xs mt-1" style={{ color: MUTED }}>
                  Settings + integrations
                </div>
              </div>

              <Card title="Training focus">
                <div className="text-sm" style={{ color: MUTED }}>
                  This only tags your profile for now.
                </div>
                <div className="mt-4">
                  <SegmentedControl
                    value={focus}
                    setValue={setFocus}
                    options={[
                      { label: "Strength", value: "STRENGTH" },
                      { label: "Hypertrophy", value: "HYPERTROPHY" },
                      { label: "Hybrid", value: "HYBRID" },
                    ]}
                  />
                </div>
              </Card>

              <Card title="Wearables">
                <div className="text-sm" style={{ color: MUTED }}>
                  Connect your watch to automatically import workouts.
                </div>
                <div className="mt-4 space-y-3">
                  <ConnectRow
                    title="Apple Health"
                    subtitle="Import workout sessions, calories and time"
                    enabled={appleHealth}
                    onToggle={() => setAppleHealth((v) => !v)}
                  />
                  <ConnectRow
                    title="Health Connect"
                    subtitle="Android integration (stub)"
                    enabled={healthConnect}
                    onToggle={() => setHealthConnect((v) => !v)}
                  />
                </div>
                <div className="mt-3 text-xs" style={{ color: MUTED }}>
                  v1: these are UI toggles only (sync stub).
                </div>
              </Card>

              <Card title="Data sources">
                <div className="flex flex-wrap gap-2">
                  <Badge>Manual journal</Badge>
                  <Badge>Wearable import</Badge>
                </div>
                <div className="mt-3 text-sm" style={{ color: MUTED }}>
                  Your Overview totals include both manual entries and imported workouts.
                </div>
              </Card>

              <PrimaryButton onClick={() => setAuthed(false)}>Logout</PrimaryButton>
            </div>
          ) : null}
        </div>
      </div>

      {/* Floating Tab Bar */}
      <FloatingTabBar
        tabs={[
          { id: "Overview", label: "Overview", icon: <Icon name="overview" /> },
          { id: "Journal", label: "Journal", icon: <Icon name="journal" /> },
          { id: "Progress", label: "Progress", icon: <Icon name="progress" /> },
          { id: "Health", label: "Health", icon: <Icon name="health" /> },
          { id: "Profile", label: "Profile", icon: <Icon name="profile" /> },
        ]}
        activeTab={tab}
        onTabChange={(id) => setTab(id as AppTab)}
      />

      {/* Add modal chooser */}
      <Modal
        open={modal?.type === "ADD"}
        title="Quick add"
        onClose={() => setModal(null)}
      >
        <div className="space-y-3">
          <button
            className="w-full rounded-xl px-4 py-3.5 text-left transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}
            onClick={() => setModal({ type: "LIFT" })}
          >
            <div className="text-sm font-semibold" style={{ color: TEXT }}>
              Add lift top set
            </div>
            <div className="text-xs mt-1" style={{ color: MUTED }}>
              Weight + reps
            </div>
          </button>
          <button
            className="w-full rounded-xl px-4 py-3.5 text-left transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}
            onClick={() => setModal({ type: "CARDIO" })}
          >
            <div className="text-sm font-semibold" style={{ color: TEXT }}>
              Add cardio effort
            </div>
            <div className="text-xs mt-1" style={{ color: MUTED }}>
              Default: max calories in 60 seconds
            </div>
          </button>
          <button
            className="w-full rounded-xl px-4 py-3.5 text-left transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}
            onClick={() => setModal({ type: "RUN" })}
          >
            <div className="text-sm font-semibold" style={{ color: TEXT }}>
              Add run
            </div>
            <div className="text-xs mt-1" style={{ color: MUTED }}>
              Distance + time or pace
            </div>
          </button>
        </div>
      </Modal>

      {/* Lift modal */}
      <Modal
        open={modal?.type === "LIFT"}
        title="Log lift top set"
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <Select
            label="Lift"
            value={selectedLift}
            onChange={(v) => setSelectedLift(v as LiftType)}
            options={["Deadlift", "Back Squat", "Front Squat", "Bench Press", "Incline Bench Press"]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Weight (kg)" value={liftWeight} onChange={setLiftWeight} placeholder="e.g. 100" type="number" />
            <Input label="Reps" value={liftReps} onChange={setLiftReps} placeholder="e.g. 5" type="number" />
          </div>
          
          {/* RPE Selector */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-xs font-medium" style={{ color: MUTED }}>
                RPE (optional)
              </div>
              <button
                onClick={() => setShowRPEInfo(true)}
                className="w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 hover:opacity-80"
                style={{ 
                  border: `1px solid ${TEXT}`,
                  color: TEXT
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = ACCENT;
                  e.currentTarget.style.color = ACCENT;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = TEXT;
                  e.currentTarget.style.color = TEXT;
                }}
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[6, 7, 8, 9, 10].map((rpe) => (
                <button
                  key={rpe}
                  onClick={() => setLiftRPE(liftRPE === rpe ? null : rpe)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-95"
                  style={
                    liftRPE === rpe
                      ? {
                          background: ACCENT,
                          color: TEXT,
                          boxShadow: "0 2px 6px rgba(0,0,255,0.3)",
                        }
                      : {
                          background: "rgba(255,255,255,0.05)",
                          color: TEXT,
                          border: `1px solid ${BORDER}`,
                        }
                  }
                >
                  {rpe}
                </button>
              ))}
              {liftRPE !== null && (
                <button
                  onClick={() => setLiftRPE(null)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: MUTED,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <PrimaryButton onClick={addLift} disabled={!liftWeight || !liftReps}>
            Save
          </PrimaryButton>
        </div>
      </Modal>

      {/* RPE Info Modal */}
      <Modal
        open={showRPEInfo}
        title="What is RPE?"
        onClose={() => setShowRPEInfo(false)}
      >
        <div className="space-y-4">
          <div className="text-sm leading-relaxed" style={{ color: TEXT }}>
            <p className="mb-3">
              RPE stands for <strong>Rate of Perceived Exertion</strong>.
            </p>
            <p className="mb-3">
              It's a simple way to describe how hard a set felt, on a scale from 1–10.
            </p>
            <div className="space-y-2 mt-4">
              <div>
                <strong style={{ color: ACCENT }}>8</strong> = Hard, but you could do 2 more reps
              </div>
              <div>
                <strong style={{ color: ACCENT }}>9</strong> = Very hard, maybe 1 rep left
              </div>
              <div>
                <strong style={{ color: ACCENT }}>10</strong> = Max effort, nothing left
              </div>
            </div>
            <p className="mt-4">
              Logging RPE helps track how hard you're training — not just how much weight you lift.
            </p>
          </div>
          <PrimaryButton onClick={() => setShowRPEInfo(false)}>
            Got it
          </PrimaryButton>
        </div>
      </Modal>

      {/* Cardio modal */}
      <Modal
        open={modal?.type === "CARDIO"}
        title="Log cardio effort"
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <Select
            label="Machine"
            value={selectedMachine}
            onChange={(v) => setSelectedMachine(v as CardioMachine)}
            options={["RowErg", "BikeErg", "SkiErg", "Assault Bike"]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Calories" value={cardioCalories} onChange={setCardioCalories} placeholder="e.g. 18" type="number" />
            <Input label="Time (seconds)" value={cardioSeconds} onChange={setCardioSeconds} placeholder="60" type="number" />
          </div>
          <div className="text-xs" style={{ color: MUTED }}>
            Default is 60 seconds max calories.
          </div>
          <PrimaryButton onClick={addCardio} disabled={!cardioCalories || !cardioSeconds}>
            Save
          </PrimaryButton>
        </div>
      </Modal>

      {/* Run modal */}
      <Modal
        open={modal?.type === "RUN"}
        title="Log run"
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[200, 400, 600, 800, 1000].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setRunDistance(String(d));
                  setSelectedRunDistance(d);
                }}
              className="rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
                style={
                  Number(runDistance) === d
                  ? { 
                      background: ACCENT, 
                      border: `1px solid rgba(0,0,255,0.6)`, 
                      color: TEXT,
                      boxShadow: "0 2px 6px rgba(0,0,255,0.3)"
                    }
                  : { 
                      background: "rgba(255,255,255,0.05)", 
                      border: `1px solid ${BORDER}`, 
                      color: TEXT 
                    }
                }
              >
                {d}m
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Distance (m)" value={runDistance} onChange={setRunDistance} placeholder="e.g. 800" type="number" />
            <Input label="Rounds" value={runRounds} onChange={setRunRounds} placeholder="1" type="number" />
          </div>

          <SegmentedControl
            value={runInputType}
            setValue={setRunInputType}
            options={[
              { label: "Time", value: "TIME" },
              { label: "Pace", value: "PACE" },
            ]}
          />

          {runInputType === "TIME" ? (
            <Input label="Time (mm:ss)" value={runTime} onChange={setRunTime} placeholder="e.g. 3:45" />
          ) : (
            <Input label="Pace (min/km)" value={runPace} onChange={setRunPace} placeholder="e.g. 4:45" />
          )}

          <PrimaryButton onClick={addRun}>Save</PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}

export default App;
