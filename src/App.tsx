import React, { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, Plus, Footprints, Moon, Heart, Trash2, Trophy, Dumbbell, TrendingUp, Zap, MoreHorizontal, Bell, Users, ChevronRight, Play, RotateCcw, Timer, Calculator } from "lucide-react";

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

import { colors, radii, shadows, gradients, typography, spacing } from "./styles/tokens";
import { supabase } from "./lib/supabase";
import {
  fetchProfile,
  updateProfile,
  fetchLifts,
  insertLift,
  deleteLift,
  fetchCardio,
  insertCardio,
  deleteCardio,
  fetchRuns,
  insertRun,
  deleteRun,
  fetchImported,
  fetchHealth,
} from "./lib/db";
import { fetchStravaConnection, fetchStravaActivities, syncStrava, connectStrava, disconnectStrava, mapStravaTypeToCategory } from "./lib/strava";
import { GlassCard } from "./components/GlassCard";
import { PrimaryButton } from "./components/PrimaryButton";
import { IconButton } from "./components/IconButton";
import { SegmentedControl } from "./components/SegmentedControl";
import { StatTile } from "./components/StatTile";
import { ListRow } from "./components/ListRow";
import { FloatingTabBar } from "./components/FloatingTabBar";
import { HealthMetricTile } from "./components/HealthMetricTile";
import { AppLayout } from "./components/AppLayout";
import { ToastContainer } from "./components/Toast";
import { useToast } from "./hooks/useToast";
import { MetricCardHeader } from "./components/MetricCardHeader";
import { MasterDashboard } from "./components/MasterDashboard";
import { BottomSheet } from "./components/BottomSheet";
import { PlateCalculator } from "./components/PlateCalculator";
import { RestTimer } from "./components/RestTimer";
import { useTheme } from "./hooks/useTheme";
import { ReadinessCard } from "./components/ReadinessCard";
import { DeviceSyncStrip } from "./components/DeviceSyncStrip";
import { CommunityFeed } from "./components/CommunityFeed";
import { StreakCard } from "./components/StreakCard";
import { JumpBackInCard } from "./components/JumpBackInCard";
import { GymChallengesCard } from "./components/GymChallengesCard";
import { BadgesScreen } from "./components/BadgesScreen";
import { WorkoutTracker } from "./components/WorkoutTracker";
import { WorkoutSummary, WorkoutSummaryData } from "./components/WorkoutSummary";
import { CoachPortal } from "./components/CoachPortal";
import { ChallengesScreen } from "./components/ChallengesScreen";

type TrainingFocus = "STRENGTH" | "HYPERTROPHY" | "HYBRID";

type LiftType =
  | "Deadlift"
  | "Back Squat"
  | "Front Squat"
  | "Bench Press"
  | "Incline Bench Press"
  | "Incline Bench"
  | "Pendlay Row"
  | "Devils Press"
  | "Step Forward Lunge"
  | "Box Squat"
  | "Sumo Deadlift"
  | "Power Clean"
  | "Hang Clean"
  | "Shoulder Press";

type CardioMachine = "RowErg" | "BikeErg" | "SkiErg" | "Assault Bike";

type JournalTab = "All" | "Lifts" | "Cardio" | "Running";

type DateRange = "7" | "30" | "90" | "365";

type AppTab = "Train" | "Progress" | "Body" | "Badges" | "Profile";
type SubView = "workout" | "summary" | "challenges" | "coach" | null;

type AppMode = "AUTH" | "ONBOARDING_FOCUS" | "WELCOME" | "APP";
type OnboardingStep = "signup" | "focus" | "welcome" | "app";

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

const LIFT_OPTIONS: LiftType[] = [
  "Bench Press",
  "Incline Bench Press",
  "Incline Bench",
  "Deadlift",
  "Sumo Deadlift",
  "Back Squat",
  "Box Squat",
  "Front Squat",
  "Pendlay Row",
  "Devils Press",
  "Step Forward Lunge",
  "Power Clean",
  "Hang Clean",
  "Shoulder Press",
];

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

function Icon({ name }: { name: "train" | "progress" | "body" | "badges" | "profile" }) {
  const common = "w-5 h-5";
  if (name === "train") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.5 6.5h1.5v11H6.5v-11Zm9.5 0H14.5v11H16V6.5Zm-5-2H13v15h-1.5V4.5ZM3 9h3v6H3V9Zm15 0h3v6h-3V9Z" fill="currentColor"/>
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
  if (name === "body") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" fill="currentColor"/>
      </svg>
    );
  }
  if (name === "badges") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L8.5 8.5 1 9.8l5.5 5.3L5.2 22 12 18.5 18.8 22l-1.3-6.9L23 9.8l-7.5-1.3L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15"/>
      </svg>
    );
  }
  if (name === "master") {
    return <TrendingUp className={common} stroke="currentColor" strokeWidth={2.2} />;
  }
  if (name === "badges") {
    return <Trophy className={common} stroke="currentColor" strokeWidth={2.2} />;
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

function Badge({ children }: { children?: React.ReactNode }) {
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
  children?: React.ReactNode;
}) {
  return (
    <div style={{ 
      background: colors.cardBg2,
      border: `1px solid ${colors.border}`,
      borderRadius: radii.card,
      boxShadow: shadows.card,
      padding: spacing.cardPad,
    }}>
      <div className="flex items-center justify-between" style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "15px", fontWeight: 600, color: TEXT }}>
          {title}
        </div>
        {right}
      </div>
      <div>{children}</div>
    </div>
  );
}

function formatDateShort(iso: string) {
  const d = isoToDate(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function ensureDateISO(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayISO();
}

function BadgeCard({
  title,
  description,
  icon,
  locked,
  progress,
}: {
  key?: React.Key;
  title: string;
  description: string;
  icon: string;
  locked: boolean;
  progress?: number;
}) {
  return (
    <div
      className="flex items-center gap-4"
      style={{
        background: colors.cardBg,
        border: `1px solid ${BORDER}`,
        borderRadius: "var(--card-radius)",
        padding: "var(--card-pad)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        opacity: locked ? 0.8 : 1,
      }}
    >
      <div className="text-2xl">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-semibold" style={{ color: TEXT }}>
          {title}
        </div>
        <div className="text-xs mt-0.5" style={{ color: MUTED }}>
          {description}
        </div>
        {locked && typeof progress === "number" && (
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${clamp(progress, 0, 100)}%`, background: ACCENT, boxShadow: `0 0 8px ${colors.accentGlow}` }}
              />
            </div>
            <div className="text-[10px] mt-1" style={{ color: MUTED }}>
              {Math.round(progress)}% complete
            </div>
          </div>
        )}
      </div>
      {locked ? (
        <div className="text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)", color: MUTED }}>
          Locked
        </div>
      ) : (
        <div className="text-[10px] px-2 py-1 rounded-full" style={{ background: colors.accentSoft, color: TEXT }}>
          Earned
        </div>
      )}
    </div>
  );
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

function buildEmptyData() {
  const focus: TrainingFocus = "HYBRID";
  const lifts: LiftEntry[] = [];
  const cardio: CardioEntry[] = [];
  const runs: RunEntry[] = [];
  const imported: ImportedWorkout[] = [];
  const health: HealthMetric[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const iso = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    health.push({
      dateISO: iso,
      steps: 0,
      sleepHours: 0,
      avgBPM: 0,
      caloriesBurned: 0,
      activeMinutes: 0,
      sleepStages: [],
    });
  }
  return { focus, lifts, cardio, runs, imported, health, onboarding_complete: false };
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
  centered = false,
  maxWidth = "sm:max-w-lg",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
  centered?: boolean;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div 
      className={classNames(
        "fixed inset-0 z-50 flex justify-center",
        centered ? "items-center" : "items-end sm:items-center"
      )}
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className={classNames("w-full rounded-t-3xl sm:rounded-3xl", maxWidth)}
        style={{ background: colors.cardBg2, border: `1px solid ${colors.border}`, boxShadow: shadows.card }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 pt-6 pb-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold" style={{ color: TEXT }}>
              {title}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ background: "var(--surface)", color: TEXT, border: "var(--border)" }}
            >
              Close
            </button>
          </div>
        </div>
        <div className="px-6 py-5">{children}</div>
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
        className="w-full px-4 py-3 outline-none transition-all duration-200 focus:ring-2"
        style={{ 
          background: colors.cardBg2, 
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

function TextField({
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
  const [focused, setFocused] = useState(false);
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full outline-none transition-all duration-200"
        style={{ 
          background: colors.cardBg,
          border: `1px solid ${focused ? colors.accentBorder : colors.border}`,
          color: colors.text,
          borderRadius: radii.input,
          padding: spacing.cardPad,
          boxShadow: focused ? `0 0 0 3px ${colors.accentGlow}20, 0 2px 8px rgba(0,0,0,0.3)` : "0 1px 3px rgba(0,0,0,0.2)",
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
        className="w-full px-4 py-3 outline-none transition-all duration-200 focus:ring-2"
        style={{ 
          background: colors.cardBg2, 
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
  onDelete,
}: {
  key?: React.Key;
  title: string;
  subtitle: string;
  right: string;
  onClick?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={classNames("w-full text-left px-4 py-3 transition-all duration-200", onClick ? "cursor-pointer hover:opacity-90 active:scale-[0.98]" : "")}
      style={{ borderRadius: radii.input, background: colors.cardBg2, border: `1px solid ${colors.border}` }}
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
        <div className="flex items-center gap-3">
        <div className="text-sm font-medium" style={{ color: TEXT }}>
          {right}
        </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ border: `1px solid ${BORDER}`, color: MUTED }}
              aria-label="Delete entry"
              title="Delete entry"
            >
              <Trash2 size={14} />
    </button>
          )}
        </div>
      </div>
    </div>
  );
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
    <div className="flex items-center justify-between gap-4 transition-all duration-200" style={{
      background: "var(--surface)",
      border: "var(--border)",
      borderRadius: "var(--card-radius)",
      padding: "var(--card-pad)",
    }}>
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

function GroupedLiftRow({
  liftType,
  entries,
  isExpanded,
  onToggle,
  onSelectLift,
  onDeleteEntry,
}: {
  key?: React.Key;
  liftType: LiftType;
  entries: LiftEntry[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelectLift: () => void;
  onDeleteEntry: (id: string) => void;
}) {
  const sortedEntries = [...entries].sort((a, b) => isoToDate(b.dateISO).getTime() - isoToDate(a.dateISO).getTime());
  const latest = sortedEntries[0];
  const count = entries.length;
  
  return (
    <div className="overflow-hidden" style={{ 
      background: colors.cardBg2,
      border: `1px solid ${colors.border}`,
      borderRadius: radii.card,
    }}>
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
            className="text-xs px-3 py-1.5 transition-all duration-200 hover:opacity-90"
            style={{ borderRadius: radii.pill, background: "rgba(0,0,255,0.15)", border: `1px solid rgba(0,0,255,0.3)`, color: TEXT }}
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
                className="flex items-center justify-between py-2 px-3"
                style={{ borderRadius: radii.input, background: colors.cardBg2 }}
              >
                <div>
                  <div className="text-xs font-medium" style={{ color: TEXT }}>
                    {formatDateShort(entry.dateISO)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                <div className="text-xs font-semibold" style={{ color: TEXT }}>
                  {entry.weightKg} kg × {entry.reps}{entry.rpe ? ` · RPE ${entry.rpe}` : ""}
                  </div>
                  <button
                    onClick={() => onDeleteEntry(entry.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:opacity-90 active:scale-95"
                    style={{ border: `1px solid ${BORDER}`, color: MUTED }}
                    aria-label="Delete lift entry"
                    title="Delete entry"
                  >
                    <Trash2 size={12} />
                  </button>
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
  onDeleteEntry,
}: {
  key?: React.Key;
  machine: CardioMachine;
  entries: CardioEntry[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelectMachine: () => void;
  onDeleteEntry: (id: string) => void;
}) {
  const sortedEntries = [...entries].sort((a, b) => isoToDate(b.dateISO).getTime() - isoToDate(a.dateISO).getTime());
  const latest = sortedEntries[0];
  const count = entries.length;
  
  return (
    <div className="overflow-hidden" style={{ 
      background: colors.cardBg2,
      border: `1px solid ${colors.border}`,
      borderRadius: radii.card,
    }}>
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
            className="text-xs px-3 py-1.5 transition-all duration-200 hover:opacity-90"
            style={{ borderRadius: radii.pill, background: "rgba(0,0,255,0.15)", border: `1px solid rgba(0,0,255,0.3)`, color: TEXT }}
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
                className="flex items-center justify-between py-2 px-3"
                style={{ borderRadius: radii.input, background: colors.cardBg2 }}
              >
                <div>
                  <div className="text-xs font-medium" style={{ color: TEXT }}>
                    {formatDateShort(entry.dateISO)} • {entry.seconds}s
                  </div>
                </div>
                <div className="flex items-center gap-3">
                <div className="text-xs font-semibold" style={{ color: TEXT }}>
                  {entry.calories} cal
                  </div>
                  <button
                    onClick={() => onDeleteEntry(entry.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:opacity-90 active:scale-95"
                    style={{ border: `1px solid ${BORDER}`, color: MUTED }}
                    aria-label="Delete cardio entry"
                    title="Delete entry"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type UserData = ReturnType<typeof buildEmptyData>;

function FullScreenLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG, color: TEXT }}>
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-t-transparent rounded-full mx-auto mb-4 animate-spin" style={{
          borderColor: ACCENT,
          borderTopColor: 'transparent',
        }} />
        <p className="text-sm" style={{ color: MUTED }}>{message}</p>
      </div>
    </div>
  );
}

function App() {
  const { c } = useTheme();
  const BG = c.bg;
  const TEXT = c.text;
  const MUTED = c.muted;
  const ACCENT = c.accent;
  const BORDER = c.border;
  const CARD = c.cardBg;
  const CARD2 = c.cardBg2;
  const emptyData = useMemo(() => buildEmptyData(), []);
  const { toasts, showToast, dismissToast } = useToast();
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
  const hasSupabaseEnv = Boolean(supabaseUrl) && Boolean(supabaseAnonKey);
  const hasPlaceholderSupabaseEnv =
    supabaseUrl.includes("YOUR_PROJECT_REF") || supabaseAnonKey.includes("YOUR_ANON_KEY");
  const devBypassAuth = import.meta.env.DEV && (!hasSupabaseEnv || hasPlaceholderSupabaseEnv);

  const [session, setSession] = useState<null | { user: { id: string } }>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const [tab, setTab] = useState<AppTab>("Train");
  const [subView, setSubView] = useState<SubView>(null);
  const [summaryData, setSummaryData] = useState<WorkoutSummaryData | null>(null);
  
  // App mode state machine
  const [mode, setMode] = useState<AppMode>("AUTH");
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  const [profileTrainingFocus, setProfileTrainingFocus] = useState<TrainingFocus | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const [profileRole, setProfileRole] = useState<string>("member");
  const [profileDisplayName, setProfileDisplayName] = useState<string>("Member");
  const [profileLoading, setProfileLoading] = useState(false);
  const [focus, setFocus] = useState<TrainingFocus>(emptyData.focus);
  const [range, setRange] = useState<DateRange>("30");

  const [lifts, setLifts] = useState<LiftEntry[]>(emptyData.lifts);
  const [cardio, setCardio] = useState<CardioEntry[]>(emptyData.cardio);
  const [runs, setRuns] = useState<RunEntry[]>(emptyData.runs);
  const [imported, setImported] = useState<ImportedWorkout[]>(emptyData.imported);
  const [healthData, setHealthData] = useState<HealthMetric[]>(emptyData.health);
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
  
  // --- Auth & Onboarding
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [onboardingStep, setOnboardingStep] = useState<"login" | "step1" | "step2" | "step3">("login");
  const [onboardingData, setOnboardingData] = useState({
    name: "",
    age: "",
    email: "",
    password: "",
    goal: "HYBRID" as TrainingFocus,
  });
  const [showQuickStartSheet, setShowQuickStartSheet] = useState(false);
  const [showRestSheet, setShowRestSheet] = useState(false);
  const [showPlateSheet, setShowPlateSheet] = useState(false);
  const [hideDeloadBanner, setHideDeloadBanner] = useState(false);
  const [stravaConnection, setStravaConnection] = useState<{ athlete_name: string; last_sync_at: string } | null>(null);
  const [stravaActivities, setStravaActivities] = useState<Array<{ id: string; type: string; start_date: string; name?: string; distance_m?: number; moving_time: number; calories?: number; average_heartrate?: number }>>([]);
  const [stravaSyncLoading, setStravaSyncLoading] = useState(false);
  const [stravaLoading, setStravaLoading] = useState(false);


  // Bootstrap: Initialize auth session - CRITICAL: Must complete before any profile operations
  useEffect(() => {
    let mounted = true;

    if (devBypassAuth) {
      console.warn("[AuthBootstrap] Dev auth bypass enabled (missing/placeholder Supabase env).");
      setSession({ user: { id: "local-dev-user" } });
      setSessionLoading(false);
      setDataLoaded(true);
      setProfileLoading(false);
      setOnboardingComplete(true);
      setMode("APP");
      return () => {
        mounted = false;
      };
    }
    
    const initializeAuth = async () => {
      console.log('[AuthBootstrap] Initializing auth session...');
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('[AuthBootstrap] Error getting session:', error);
          setSession(null);
          setSessionLoading(false);
          return;
        }

        if (data.session?.user?.id) {
          console.log('[AuthBootstrap] Session found, user id:', data.session.user.id);
          // Only set session if we have a valid user ID from the session
          setSession({ user: { id: data.session.user.id } });
        } else {
          console.log('[AuthBootstrap] No session found');
          setSession(null);
        }
      } catch (err) {
        console.error('[AuthBootstrap] Unexpected error:', err);
        setSession(null);
      } finally {
        if (mounted) {
          setSessionLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;
      
      console.log('[AuthBootstrap] Auth state changed:', event, nextSession?.user?.id);
      
      if (nextSession?.user?.id) {
        console.log('[AuthBootstrap] New session, user id:', nextSession.user.id);
        // Only set session if we have a valid user ID
        setSession({ user: { id: nextSession.user.id } });
      } else {
        console.log('[AuthBootstrap] Session cleared');
        setSession(null);
        // Reset welcome seen on logout
        setWelcomeSeen(false);
        setMode("AUTH");
      }
      
      setSessionLoading(false);
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [devBypassAuth]);

  // Determine mode based on session and profile state
  useEffect(() => {
    // Wait for session to finish loading before determining mode
    if (sessionLoading) {
      return;
    }
    
    // If no session, always show auth
    if (!session?.user) {
      setMode("AUTH");
      return;
    }

    // If profile is still loading, wait (but we have a session)
    if (profileLoading || !dataLoaded) {
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7835/ingest/77277bb7-a6f7-43e6-8ec6-2bc6b08bab10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c095c6'},body:JSON.stringify({sessionId:'c095c6',runId:'initial',hypothesisId:'H3',location:'App.tsx:modeEffect',message:'mode-effect-evaluation',data:{hasUser:!!session?.user,sessionLoading,profileLoading,dataLoaded,profileTrainingFocus,onboardingComplete},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // CRITICAL: Check onboarding_complete first
    // If onboarding is not complete, show onboarding steps
    if (!onboardingComplete) {
      // If training_focus is missing or null, show focus selection
      if (!profileTrainingFocus) {
        setMode("ONBOARDING_FOCUS");
        return;
      }
      // If training_focus exists but onboarding not complete, show welcome
      setMode("WELCOME");
      return;
    }

    // Otherwise, show the app
    setMode("APP");
  }, [session, sessionLoading, dataLoaded, profileLoading, profileTrainingFocus, onboardingComplete]);

  // Profile + data loading from relational tables
  useEffect(() => {
    if (devBypassAuth) {
      setFocus(emptyData.focus);
      setLifts(emptyData.lifts);
      setCardio(emptyData.cardio);
      setRuns(emptyData.runs);
      setImported(emptyData.imported);
      setHealthData(emptyData.health);
      setProfileTrainingFocus(emptyData.focus || "HYBRID");
      setOnboardingComplete(true);
      setDataLoaded(true);
      setProfileLoading(false);
      return;
    }

    if (sessionLoading) return;

    if (!session?.user?.id) {
      setDataLoaded(false);
      setFocus(emptyData.focus);
      setLifts(emptyData.lifts);
      setCardio(emptyData.cardio);
      setRuns(emptyData.runs);
      setImported(emptyData.imported);
      setHealthData(emptyData.health);
      setProfileTrainingFocus(null);
      setProfileRole("member");
      return;
    }

    const userId = session.user.id;
    setProfileLoading(true);

    let cancelled = false;
    const load = async () => {
      try {
        // 1. Profile metadata
        const profile = await fetchProfile(userId);
      if (cancelled) return;

        if (profile) {
          setProfileTrainingFocus(profile.training_focus);
          setOnboardingComplete(profile.onboarding_complete);
          setProfileRole(profile.role ?? "member");
          setProfileDisplayName(profile.display_name ?? "Member");
          if (profile.training_focus) setFocus(profile.training_focus);
        } else {
          // Profile row created by trigger — just set defaults
            setProfileTrainingFocus(null);
          setProfileRole("member");
          setOnboardingComplete(false);
        }

        // 2. Load all data tables in parallel
        const [liftsData, cardioData, runsData, importedData, healthRows] = await Promise.all([
          fetchLifts(userId),
          fetchCardio(userId),
          fetchRuns(userId),
          fetchImported(userId),
          fetchHealth(userId),
        ]);

        if (cancelled) return;

        setLifts(liftsData as LiftEntry[]);
        setCardio(cardioData as CardioEntry[]);
        setRuns(runsData as RunEntry[]);
        setImported(importedData as ImportedWorkout[]);
        if (healthRows.length > 0) {
          setHealthData(healthRows as HealthMetric[]);
        }
      } catch (err) {
        console.error('[ProfileLoader] Error loading data:', err);
      } finally {
        if (!cancelled) {
        setDataLoaded(true);
        setProfileLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, sessionLoading, devBypassAuth, emptyData]);

  // Handle URL tab query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['Train', 'Progress', 'Body', 'Badges', 'Profile'].includes(tabParam)) {
      setTab(tabParam as AppTab);
    }
    if (urlParams.toString()) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Serialise current state for saving to profiles.data
  const buildUserData = () => ({
    focus,
    lifts,
    cardio,
    runs,
    imported,
    health: healthData,
  });

  // Auto-save profile data on changes
  useEffect(() => {
    if (devBypassAuth) return;

    const userId = session?.user.id;
    if (!userId || !dataLoaded) return;

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    const snapshot = buildUserData();
    saveTimeoutRef.current = window.setTimeout(async () => {
      await supabase.from("profiles").update({ data: snapshot }).eq("id", userId);
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [focus, lifts, cardio, runs, imported, healthData, session?.user.id, dataLoaded, devBypassAuth]);

  // --- Load Strava connection and activities
  useEffect(() => {
    if (devBypassAuth) {
      setStravaConnection(null);
      setStravaActivities([]);
      return;
    }

    if (!session?.user.id) {
      setStravaConnection(null);
      setStravaActivities([]);
      return;
    }

    let cancelled = false;

    const loadStrava = async () => {
      try {
        const connection = await fetchStravaConnection();
        if (cancelled) return;
        setStravaConnection(connection ? {
          athlete_name: connection.athlete_name,
          last_sync_at: connection.last_sync_at,
        } : null);

        if (connection) {
          const activities = await fetchStravaActivities();
          if (!cancelled) {
            setStravaActivities(activities);
          }
        } else {
          setStravaActivities([]);
        }
        
        // Check for URL params (from OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('connected') === 'strava') {
          // Show success (you could add a toast here)
        }
        
        // Handle tab query parameter (for OAuth redirects)
        const tabParam = urlParams.get('tab');
        if (tabParam && ['Train', 'Progress', 'Body', 'Badges', 'Profile'].includes(tabParam)) {
          setTab(tabParam as AppTab);
        }
        
        // Clean URL after processing params
        if (urlParams.toString()) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (error) {
        console.error('Error loading Strava:', error);
        if (!cancelled) {
          setStravaConnection(null);
          setStravaActivities([]);
        }
      }
    };

    loadStrava();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, devBypassAuth]);

  // --- Lift entry form
  const [liftWeight, setLiftWeight] = useState("");
  const [liftReps, setLiftReps] = useState("");
  const [liftRPE, setLiftRPE] = useState<number | null>(null);
  const [showRPEInfo, setShowRPEInfo] = useState(false);
  const [liftDate, setLiftDate] = useState(todayISO());

  // --- Cardio form
  const [cardioCalories, setCardioCalories] = useState("");
  const [cardioSeconds, setCardioSeconds] = useState("60");
  const [cardioDate, setCardioDate] = useState(todayISO());

  // --- Run form
  const [runDistance, setRunDistance] = useState("800");
  const [runRounds, setRunRounds] = useState("1");
  const [runInputType, setRunInputType] = useState<"TIME" | "PACE">("TIME");
  const [runTime, setRunTime] = useState("3:45");
  const [runPace, setRunPace] = useState("4:45");
  const [runDate, setRunDate] = useState(todayISO());

  useEffect(() => {
    if (modal?.type === "LIFT") setLiftDate(todayISO());
    if (modal?.type === "CARDIO") setCardioDate(todayISO());
    if (modal?.type === "RUN") setRunDate(todayISO());
  }, [modal?.type]);

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
    if (range === "7") return 7;
    if (range === "30") return 30;
    if (range === "90") return 90;
    return 365;
  }, [range]);

  const overviewSeries = useMemo(
    () => buildOverviewSeries({ rangeDays, lifts, cardio, runs, imported }),
    [rangeDays, lifts, cardio, runs, imported]
  );

  const stats = useMemo(() => {
    const liftsInRange: LiftEntry[] = lifts.filter((x) => withinLastDays(x.dateISO, rangeDays));
    const cardioInRange: CardioEntry[] = cardio.filter((x) => withinLastDays(x.dateISO, rangeDays));
    const runsInRange: RunEntry[] = runs.filter((x) => withinLastDays(x.dateISO, rangeDays));
    const importedInRange: ImportedWorkout[] = imported.filter((x) => withinLastDays(x.dateISO, rangeDays));

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

  const streakData = useMemo(() => {
    // Build a set of all dates that had any training activity
    const trainedDates = new Set<string>([
      ...lifts.map((lft) => lft.dateISO),
      ...cardio.map((crd) => crd.dateISO),
      ...runs.map((run) => run.dateISO),
    ]);

    // Build the Mon–Sun week containing today
    const today = new Date();
    // getDay(): Sun=0 Mon=1 … Sat=6 → convert to Mon=0 … Sun=6
    const dayOfWeek = (today.getDay() + 6) % 7;
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - dayOfWeek + i);
      weekDates.push(d.toISOString().slice(0, 10));
    }

    const completedDays = weekDates.map((d) => trainedDates.has(d));
    const todayIndex = dayOfWeek;

    // Consecutive-day streak going backwards from today
    // If today has no training yet, still count from yesterday
    const todayISO = today.toISOString().slice(0, 10);
    let streak = 0;
    const startOffset = trainedDates.has(todayISO) ? 0 : 1;
    for (let i = startOffset; i <= 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (trainedDates.has(d.toISOString().slice(0, 10))) {
        streak++;
      } else {
        break;
      }
    }

    const streakSub = streak === 0
      ? "Log a workout to start your streak."
      : streak === 1
      ? "1 day — keep it going!"
      : `${streak} days straight — keep it up!`;

    return { completedDays, todayIndex, streakCount: streak, streakSub };
  }, [lifts, cardio, runs]);

  const readinessScore = useMemo(() => {
    const latest = healthData[0];
    if (!latest) return 72;
    const sleepScore = Math.min(100, (latest.sleepHours / 8) * 100);
    const bpmScore = Math.max(0, 100 - Math.max(0, latest.avgBPM - 55) * 2);
    const stepsScore = Math.min(100, (latest.steps / 10000) * 100);
    return Math.round((sleepScore * 0.4) + (bpmScore * 0.3) + (stepsScore * 0.3));
  }, [healthData]);

  const readinessColor = readinessScore >= 80 ? colors.green : readinessScore >= 60 ? colors.orange : colors.red;
  const showDeloadBanner = !hideDeloadBanner && stats.workouts > 24;

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
    const items: Array<{
      type: "lift" | "cardio" | "run" | "import";
      dateISO: string;
      title: string;
      subtitle: string;
      right: string;
      key: string;
      onClick?: () => void;
      onDelete?: () => void;
    }> = [];

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
        onDelete: () => deleteLiftEntry(l.id),
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
        onDelete: () => deleteCardioEntry(c.id),
      });
      }
    }

    for (const r of runs) {
      const pace = normalizeRunPace(r);
      const distKm = r.distanceMeters / 1000;
      const speed = pace && pace > 0 ? 3600 / pace : null;
      items.push({
        type: "run",
        dateISO: r.dateISO,
        title: "Run",
        subtitle: `${formatDateShort(r.dateISO)} • ${r.distanceMeters}m • ${r.rounds} round${r.rounds === 1 ? "" : "s"}`,
        right: speed ? `${speed.toFixed(2)} km/h` : `${distKm.toFixed(1)}km`,
        key: `run-${r.id}`,
        onClick: () => {
          setSelectedRunDistance(r.distanceMeters);
          setTab("Progress");
          setProgressFilter("Running");
        },
        onDelete: () => deleteRunEntry(r.id),
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

    // Add Strava activities
    for (const activity of stravaActivities) {
      const category = mapStravaTypeToCategory(activity.type);
      const dateISO = activity.start_date.split('T')[0];

      let title = activity.name || activity.type;
      let subtitle = `${formatDateShort(dateISO)}`;
      let right = '';

      if (category === 'Running' && activity.distance_m) {
        const distKm = activity.distance_m / 1000;
        const timeMin = activity.moving_time / 60;
        const speedKmh = distKm > 0 && activity.moving_time > 0 ? (distKm * 3600) / activity.moving_time : 0;
        subtitle += ` • ${distKm.toFixed(2)}km • ${Math.floor(timeMin)}:${String(Math.floor((timeMin % 1) * 60)).padStart(2, '0')}`;
        right = `${speedKmh.toFixed(2)} km/h`;
      } else if (category === 'Cardio') {
        const timeMin = activity.moving_time / 60;
        subtitle += ` • ${Math.floor(timeMin)}:${String(Math.floor((timeMin % 1) * 60)).padStart(2, '0')}`;
        if (activity.calories) {
          right = `${activity.calories} cal`;
        } else if (activity.average_heartrate) {
          right = `HR ${Math.round(activity.average_heartrate)}`;
        } else {
          right = activity.type;
        }
      } else {
        const timeMin = activity.moving_time / 60;
        subtitle += ` • ${Math.floor(timeMin)}:${String(Math.floor((timeMin % 1) * 60)).padStart(2, '0')}`;
        right = activity.type;
      }

      const onClickFn = category === 'Running' ? () => {
        setSelectedRunDistance(activity.distance_m ? Math.round(activity.distance_m) : 800);
        setTab("Progress");
        setProgressFilter("Running");
      } : category === 'Cardio' ? () => {
        // Could navigate to cardio progress if needed
      } : undefined;

      if (category === 'Running') {
        items.push({ type: 'run' as const, dateISO, title, subtitle, right, key: `strava-${activity.id}`, onClick: onClickFn! });
      } else if (category === 'Cardio') {
        items.push({ type: 'cardio' as const, dateISO, title, subtitle, right, key: `strava-${activity.id}`, onClick: onClickFn! });
      } else {
        items.push({ type: 'import' as const, dateISO, title, subtitle, right, key: `strava-${activity.id}` });
      }
    }

    items.sort((a, b) => isoToDate(b.dateISO).getTime() - isoToDate(a.dateISO).getTime());

    const filtered = items.filter((it) => {
      if (journalTab === "All") return true;
      if (journalTab === "Lifts") return false; // Handled separately with grouped view
      if (journalTab === "Cardio") return it.type === "cardio";
      if (journalTab === "Running") return it.type === "run";
      return false;
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
      .map((r) => {
        const paceSec = normalizeRunPace(r);
        if (!paceSec || paceSec <= 0) return null;
        const speedKmh = +(3600 / paceSec).toFixed(2);
        return {
          dateISO: r.dateISO,
          value: speedKmh,
          rounds: r.rounds,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.value > 0);
    return rows;
  }, [runs, selectedRunDistance, progressTimeRange]);

  const progressBreadcrumb = useMemo(() => {
    if (progressFilter === "Lifts") return `Progress → ${selectedLift}`;
    if (progressFilter === "Cardio") return `Progress → ${selectedMachine}`;
    return `Progress → Running (${selectedRunDistance}m)`;
  }, [progressFilter, selectedLift, selectedMachine, selectedRunDistance]);

  const badges = useMemo(
    () => [
      { title: "First Workout", description: "Complete your first workout", icon: "🎯", locked: false },
      { title: "5 Workouts", description: "Complete 5 total workouts", icon: "🔥", locked: false },
      { title: "10,000kg Volume", description: "Reach 10,000kg total volume", icon: "💪", locked: false },
      { title: "New 1RM PR", description: "Set a new 1RM personal record", icon: "⚡", locked: false },
      { title: "25 Workouts", description: "Complete 25 total workouts", icon: "🏆", locked: true, progress: 68 },
      { title: "Squat Master", description: "Squat 2x your bodyweight", icon: "🦵", locked: true, progress: 85 },
      { title: "Bench Press King", description: "Bench press 1.5x your bodyweight", icon: "💎", locked: true, progress: 72 },
      { title: "Deadlift Demon", description: "Deadlift 2.5x your bodyweight", icon: "👹", locked: true, progress: 60 },
      { title: "100 Workouts", description: "Complete 100 total workouts", icon: "🌟", locked: true, progress: 25 },
      { title: "Cardio King", description: "Complete 50 cardio sessions", icon: "❤️", locked: true, progress: 40 },
      { title: "Consistency Champion", description: "Train 4+ times per week for a month", icon: "📅", locked: true, progress: 50 },
      { title: "Iron Warrior", description: "Complete 365 workouts in a year", icon: "⚔️", locked: true, progress: 12 },
    ],
    []
  );

  const badgeSummary = useMemo(() => {
    const earnedCount = badges.filter((b) => !b.locked).length;
    return { earnedCount, totalCount: badges.length };
  }, [badges]);

  const openAdd = () => setModal({ type: "ADD" });

  function addLift() {
    const w = Number(liftWeight);
    const r = Number(liftReps);
    if (!Number.isFinite(w) || w <= 0) return;
    if (!Number.isFinite(r) || r <= 0) return;
    const dateISO = ensureDateISO(liftDate);
    const entry: LiftEntry = {
      id: `l_${crypto.randomUUID()}`,
      dateISO,
      lift: selectedLift,
      weightKg: Math.round((w / 2.5)) * 2.5,
      reps: Math.floor(r),
      ...(liftRPE !== null && liftRPE >= 1 && liftRPE <= 10 ? { rpe: liftRPE } : {}),
    };
    setLifts((prev) => [entry, ...prev]);
    if (session?.user?.id) insertLift(session.user.id, entry).catch(console.error);
    setModal(null);
    setLiftWeight("");
    setLiftReps("");
    setLiftRPE(null);
    setLiftDate(todayISO());
  }

  function addCardio() {
    const cal = Number(cardioCalories);
    const sec = Number(cardioSeconds);
    if (!Number.isFinite(cal) || cal <= 0) return;
    if (!Number.isFinite(sec) || sec <= 0) return;
    const dateISO = ensureDateISO(cardioDate);
    const entry: CardioEntry = {
      id: `c_${crypto.randomUUID()}`,
      dateISO,
      machine: selectedMachine,
      seconds: Math.floor(sec),
      calories: Math.floor(cal),
    };
    setCardio((prev) => [entry, ...prev]);
    if (session?.user?.id) insertCardio(session.user.id, entry).catch(console.error);
    setModal(null);
    setCardioCalories("");
    setCardioSeconds("60");
    setCardioDate(todayISO());
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

    const dateISO = ensureDateISO(runDate);
    const entry: RunEntry = {
      id: `r_${crypto.randomUUID()}`,
      dateISO,
      distanceMeters: Math.round(dist),
      inputType: runInputType,
      rounds: Math.floor(rounds),
      timeSeconds: timeSec ?? undefined,
      paceSecPerKm: paceSec ?? undefined,
    };

    setRuns((prev) => [entry, ...prev]);
    if (session?.user?.id) insertRun(session.user.id, entry).catch(console.error);
    setModal(null);
    setRunTime("3:45");
    setRunPace("4:45");
    setRunDate(todayISO());
  }

  function deleteLiftEntry(entryId: string) {
    if (!confirm("Delete this lift entry?")) return;
    setLifts((prev) => prev.filter((entry) => entry.id !== entryId));
    if (session?.user?.id) deleteLift(session.user.id, entryId).catch(console.error);
  }

  function deleteCardioEntry(entryId: string) {
    if (!confirm("Delete this cardio entry?")) return;
    setCardio((prev) => prev.filter((entry) => entry.id !== entryId));
    if (session?.user?.id) deleteCardio(session.user.id, entryId).catch(console.error);
  }

  function deleteRunEntry(entryId: string) {
    if (!confirm("Delete this run entry?")) return;
    setRuns((prev) => prev.filter((entry) => entry.id !== entryId));
    if (session?.user?.id) deleteRun(session.user.id, entryId).catch(console.error);
  }

  async function copyUserId() {
    const userId = session?.user.id;
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      showToast({
        title: "Copied",
        body: "User ID copied to clipboard.",
        variant: "success",
        autoDismiss: true,
        dismissAfter: 2500,
      });
    } catch {
      alert("Copy failed. Please try again.");
    }
  }

  function downloadUserData() {
    const userId = session?.user.id;
    if (!userId) return;
    const payload = {
      userId,
      exportedAt: new Date().toISOString(),
      data: { focus, lifts, cardio, runs, imported, health: healthData },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `progression-data-${userId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
      <div className="flex items-center justify-between gap-4 transition-all duration-200" style={{ 
        background: c.cardBg2,
        border: `1px solid ${c.border}`,
        borderRadius: radii.card,
        padding: spacing.cardPad,
      }}>
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

  // --- Screen Components
  function SignupScreen() {
    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPassword, setSignupPassword] = useState("");

    const isValid = name.trim() && age.trim() && signupEmail.trim() && signupPassword.trim() && signupPassword.length >= 6;

    const handleContinue = async () => {
      setAuthLoading(true);
      setAuthError(null);
      
      try {
        const { data, error } = await supabase.auth.signUp({ 
          email: signupEmail, 
          password: signupPassword,
          options: {
            data: {
              name: name.trim(),
            },
          },
        });
        
        if (error) {
          let errorMessage = error.message;
          if (errorMessage.includes("User already registered")) {
            errorMessage = "An account with this email already exists. Please log in instead.";
          } else if (errorMessage.includes("Password")) {
            errorMessage = "Password must be at least 6 characters long.";
          } else if (errorMessage.includes("Invalid email")) {
            errorMessage = "Please enter a valid email address.";
          }
          setAuthError(errorMessage);
          setAuthLoading(false);
          return;
        }
        
        if (data.user) {
          console.log('[Signup] User created:', data.user.id);
          
          // Wait for session to be established (critical for RLS policies)
          // The session is needed for auth.uid() to work in RLS
          let sessionEstablished = false;
          let attempts = 0;
          const maxAttempts = 10;
          
          while (!sessionEstablished && attempts < maxAttempts) {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user?.id === data.user.id) {
              sessionEstablished = true;
              console.log('[Signup] Session established after', attempts + 1, 'attempts');
              break;
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms between attempts
          }

          if (!sessionEstablished) {
            console.error('[Signup] Session not established after', maxAttempts, 'attempts');
            setAuthError('Session initialization failed. Please try logging in.');
            setAuthLoading(false);
            return;
          }

          // handle_new_user trigger creates the profile row.
          // Ensure it exists and set onboarding defaults.
          try {
            await updateProfile(data.user.id, {
              training_focus: null,
            onboarding_complete: false,
            });
          } catch (profileError: any) {
            console.error('[Signup] Profile update error:', profileError);
            // Profile may not exist yet if trigger is slow — that's OK,
            // the profile loader will handle it on next render.
          }
          
          // The auth state change will trigger mode transition
        }
      } catch (err: any) {
        setAuthError(err?.message || "An error occurred. Please try again.");
      } finally {
        setAuthLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG, color: TEXT }}>
        <div className="w-full max-w-[480px] px-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold mb-2" style={typography.title}>Let's get started</h1>
            <p className="text-sm" style={{ color: MUTED }}>We'll use this to personalize your experience.</p>
          </div>

          <GlassCard className="space-y-5">
            <TextField label="Name" value={name} onChange={setName} placeholder="Enter your name" />
            <TextField label="Age" value={age} onChange={setAge} placeholder="Enter your age" type="number" />
            <TextField label="Email" value={signupEmail} onChange={setSignupEmail} placeholder="you@email.com" type="email" />
            <TextField label="Password" value={signupPassword} onChange={setSignupPassword} placeholder="••••••••" type="password" />
            
            {authError && (
              <div className="text-sm text-center py-2 px-4 rounded-xl" style={{ 
                background: "rgba(255,120,120,0.1)", 
                border: "1px solid rgba(255,120,120,0.3)",
                color: "rgba(255,120,120,0.9)" 
              }}>
                {authError}
              </div>
            )}

            <PrimaryButton onClick={handleContinue} disabled={!isValid || authLoading} className="mt-2">
              {authLoading ? "Creating account..." : "Continue"}
            </PrimaryButton>
          </GlassCard>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setEmail("");
                  setPassword("");
                  setAuthError(null);
                  setOnboardingStep("login");
                }}
                className="text-sm"
                style={{ color: ACCENT }}
              >
                Already have an account? Log in →
              </button>
            </div>
        </div>
      </div>
    );
  }

  function TrainingFocusScreen() {
    const [selectedFocus, setSelectedFocus] = useState<TrainingFocus>("STRENGTH");
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const handleContinue = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7835/ingest/77277bb7-a6f7-43e6-8ec6-2bc6b08bab10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c095c6'},body:JSON.stringify({sessionId:'c095c6',runId:'initial',hypothesisId:'H2',location:'App.tsx:TrainingFocusScreen.handleContinue',message:'continue-pressed',data:{selectedFocus,hasSessionUser:!!session?.user},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!selectedFocus || !session?.user) return;
      
      setSaving(true);
      setSaveError(null);

      try {
        // #region agent log
        fetch('http://127.0.0.1:7835/ingest/77277bb7-a6f7-43e6-8ec6-2bc6b08bab10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c095c6'},body:JSON.stringify({sessionId:'c095c6',runId:'initial',hypothesisId:'H1',location:'App.tsx:TrainingFocusScreen.handleContinue',message:'updateProfile-start',data:{userId:session.user.id,selectedFocus},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        await updateProfile(session.user.id, {
          training_focus: selectedFocus,
          onboarding_complete: false,
        });

        // #region agent log
        fetch('http://127.0.0.1:7835/ingest/77277bb7-a6f7-43e6-8ec6-2bc6b08bab10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c095c6'},body:JSON.stringify({sessionId:'c095c6',runId:'initial',hypothesisId:'H1',location:'App.tsx:TrainingFocusScreen.handleContinue',message:'updateProfile-success',data:{userId:session.user.id,selectedFocus},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        setFocus(selectedFocus);
        setProfileTrainingFocus(selectedFocus);
        setOnboardingComplete(false);
        setMode("WELCOME");
      } catch (err: any) {
        // #region agent log
        fetch('http://127.0.0.1:7835/ingest/77277bb7-a6f7-43e6-8ec6-2bc6b08bab10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c095c6'},body:JSON.stringify({sessionId:'c095c6',runId:'initial',hypothesisId:'H1',location:'App.tsx:TrainingFocusScreen.handleContinue',message:'updateProfile-error',data:{message:err?.message ?? 'unknown',code:err?.code ?? null,status:err?.status ?? null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        setSaveError(err?.message || "An error occurred. Please try again.");
      } finally {
        setSaving(false);
      }
    };

    const options = [
      { value: "STRENGTH" as TrainingFocus, label: "Strength", desc: "Build maximal strength in compound lifts", icon: Dumbbell },
      { value: "HYPERTROPHY" as TrainingFocus, label: "Hypertrophy", desc: "Increase muscle size and training volume", icon: TrendingUp },
      { value: "HYBRID" as TrainingFocus, label: "Hybrid / Performance", desc: "Strength + conditioning + work capacity", icon: Zap },
    ];

    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG, color: TEXT }}>
        <div className="w-full max-w-2xl">
          <div className="mb-12 text-center">
            <h1 className="mb-4">How do you want to train right now?</h1>
            <p className="text-white/60">You can change this later</p>
          </div>

          <div className="space-y-4 mb-8">
            {options.map((option) => {
              const isSelected = selectedFocus === option.value;
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    // #region agent log
                    fetch('http://127.0.0.1:7835/ingest/77277bb7-a6f7-43e6-8ec6-2bc6b08bab10',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c095c6'},body:JSON.stringify({sessionId:'c095c6',runId:'initial',hypothesisId:'H4',location:'App.tsx:TrainingFocusScreen.optionClick',message:'focus-option-selected',data:{selectedOption:option.value},timestamp:Date.now()})}).catch(()=>{});
                    // #endregion
                    setSelectedFocus(option.value);
                  }}
                  className="w-full text-left transition-all duration-200 active:scale-[0.98]"
                  style={{
                    background: isSelected ? colors.accent : colors.cardBg,
                    border: `1px solid ${isSelected ? colors.accent : colors.border}`,
                    borderRadius: radii.xl,
                    padding: "20px",
                  }}
                >
                  <div className="flex items-start gap-6">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center"
                      style={{
                        background: isSelected ? colors.accent : "rgba(255,255,255,0.1)",
                      }}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-2">{option.label}</h3>
                      <p className="text-white/60">{option.desc}</p>
                      </div>
                  </div>
                </button>
              );
            })}
          </div>

          {saveError && (
            <div className="mb-4 text-sm text-center py-2 px-4 rounded-xl" style={{ 
              background: "rgba(255,120,120,0.1)", 
              border: "1px solid rgba(255,120,120,0.3)",
              color: "rgba(255,120,120,0.9)" 
            }}>
              {saveError}
            </div>
          )}

          <PrimaryButton onClick={handleContinue} disabled={!selectedFocus || saving}>
              {saving ? "Saving..." : "Continue"}
            </PrimaryButton>
        </div>
      </div>
    );
  }

  function WelcomeScreen() {
    const [loading, setLoading] = useState(true);
    const [profileExists, setProfileExists] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (sessionLoading) return;
        if (!session?.user?.id) {
          setMode("AUTH");
          setLoading(false);
          return;
        }

      const check = async () => {
        try {
          const profile = await fetchProfile(session.user.id);
          setProfileExists(!!profile);
        } catch (err: any) {
          setError('Failed to load profile. Please refresh.');
        } finally {
          setLoading(false);
        }
      };
      check();
    }, [session?.user.id, sessionLoading]);

    // Show loading state
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: BG, color: TEXT }}>
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-t-transparent rounded-full mx-auto mb-4 animate-spin" style={{ 
              borderColor: ACCENT,
              borderTopColor: 'transparent',
            }} />
            <p className="text-sm" style={{ color: MUTED }}>Loading...</p>
          </div>
        </div>
      );
    }

    // Show error state with retry option
    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: BG, color: TEXT }}>
          <div className="w-full max-w-[480px] px-6 text-center">
            <GlassCard className="space-y-4">
              <p className="text-base" style={{ color: colors.text }}>{error}</p>
              <div className="flex gap-3">
                <PrimaryButton 
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    // Retry profile check
                    const checkProfile = async () => {
                      if (!session?.user?.id) {
                        setMode("AUTH");
                        return;
                      }
                      try {
                        const { data: profileData } = await supabase
                          .from("profiles")
                          .select("id, data")
                          .eq("id", session.user.id)
                          .single();
                        if (profileData) {
                          setProfileExists(true);
                        } else {
                          setError('Profile not found. Please try refreshing.');
                        }
                      } catch (err: any) {
                        setError(`Error: ${err.message || 'Unknown error'}`);
                      } finally {
                        setLoading(false);
                      }
                    };
                    checkProfile();
                  }}
                  style={{ flex: 1, height: "56px", borderRadius: radii.xl }}
                >
                  Retry
                </PrimaryButton>
                <PrimaryButton 
                  onClick={() => window.location.reload()}
                  style={{ 
                    flex: 1, 
                    height: "56px", 
                    borderRadius: radii.xl,
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  Refresh
                </PrimaryButton>
              </div>
            </GlassCard>
          </div>
        </div>
      );
    }

    // No session - should redirect but show message
    if (!session?.user.id) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: BG, color: TEXT }}>
          <div className="text-center">
            <p className="text-sm" style={{ color: MUTED }}>Redirecting to login...</p>
          </div>
        </div>
      );
    }

    // Show welcome message
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG, color: TEXT }}>
        <div className="w-full max-w-[480px] px-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ 
              background: colors.accentSoft,
              border: `1px solid ${colors.accentBorder}`,
              boxShadow: shadows.glow,
            }}>
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: ACCENT }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold mb-4" style={typography.title}>You're all set</h1>
          </div>

          <GlassCard className="space-y-4 mb-6" glow>
            <p className="text-base leading-relaxed text-center" style={{ color: colors.text }}>
              We can't wait to see your progress over the next 8 weeks!
            </p>
            <p className="text-sm leading-relaxed text-center" style={{ color: MUTED }}>
              Reminder to book those classes in and stay consistent.
            </p>
            <p className="text-base leading-relaxed text-center mt-4" style={{ color: colors.text }}>
              Big love from the Hybrid House Team!
            </p>
          </GlassCard>

          <PrimaryButton 
            onClick={async () => {
              if (!session?.user?.id) {
                setMode("AUTH");
                return;
              }

              try {
                const currentData = buildUserData();
                const { error } = await supabase
                  .from("profiles")
                  .update({ data: { ...currentData, onboarding_complete: true } })
                  .eq("id", session.user.id);

                if (error) {
                  console.error('[Welcome] Failed to update onboarding_complete:', error);
                }

                setOnboardingComplete(true);
                setWelcomeSeen(true);
                setTab("Train");
                setMode("APP");
              } catch (err: any) {
                console.error('[Welcome] Error updating onboarding_complete:', err);
                setOnboardingComplete(true);
                setWelcomeSeen(true);
                setTab("Train");
                setMode("APP");
              }
            }}
            style={{ height: "56px", borderRadius: radii.xl }}
          >
            Access Profile
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // --- AUTH UI
  const authed = !!session?.user;

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    setAuthMessage(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Clean up error messages for better UX
        let errorMessage = error.message;
        if (errorMessage.includes("publishable") || errorMessage.includes("Invalid API key")) {
          errorMessage = "Invalid API key configuration. Please contact support.";
        } else if (errorMessage.includes("Invalid login credentials") || errorMessage.includes("Invalid")) {
          errorMessage = "Invalid email or password";
        } else if (errorMessage.includes("Email not confirmed")) {
          errorMessage = "Please check your email and confirm your account before logging in.";
        }
        setAuthError(errorMessage);
      }
    } catch (err: any) {
      setAuthError(err?.message || "An error occurred. Please try again.");
    }
    setAuthLoading(false);
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG, color: TEXT }}>
        <div className="text-center">
          <div className="text-lg" style={{ color: MUTED }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Mode-based rendering
  if (mode === "AUTH") {
    // Show login screen or signup screen
    if (onboardingStep === "login" || !onboardingStep) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: BG, color: TEXT }}>
          <div className="w-full max-w-[480px] px-6">
            <div className="text-center mb-8">
              <div className="text-4xl font-bold mb-2">Hybrid House</div>
              <div className="text-sm mb-12" style={{ color: MUTED }}>
                Journal + Progress
              </div>
            </div>

            <GlassCard className="space-y-5">
              <Input label="Email" value={email} onChange={setEmail} placeholder="you@email.com" />
              <Input label="Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />
              <PrimaryButton onClick={handleLogin} disabled={!email || !password || authLoading}>
                {authLoading ? "Signing in..." : "Login"}
              </PrimaryButton>
              {authError && (
                <div className="text-sm text-center py-2 px-4 rounded-xl" style={{ 
                  background: "rgba(255,120,120,0.1)", 
                  border: "1px solid rgba(255,120,120,0.3)",
                  color: "rgba(255,120,120,0.9)" 
                }}>
                  {authError}
                </div>
              )}
            </GlassCard>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setOnboardingStep("step1");
                }}
                className="text-sm"
                style={{ color: ACCENT }}
              >
                Create new account →
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      return <SignupScreen />;
    }
  }

  if (mode === "ONBOARDING_FOCUS") {
    // Show loading if profile is still loading
    if (profileLoading) {
      return <FullScreenLoader message="Loading..." />;
    }
    // Ensure we have a session before showing focus screen
    if (!session?.user?.id) {
      setMode("AUTH");
      return <FullScreenLoader message="Redirecting..." />;
    }
    return <TrainingFocusScreen />;
  }

  if (mode === "WELCOME") {
    // Only show WelcomeScreen if we have a valid session
    // This prevents the error from showing when user first visits
    if (sessionLoading) {
      return <FullScreenLoader message="Loading..." />;
    }
    if (!session?.user?.id) {
      // No session, redirect to auth immediately
      console.log('[App] WELCOME mode but no session, redirecting to AUTH');
      setMode("AUTH");
      return <FullScreenLoader message="Redirecting..." />;
    }
    return <WelcomeScreen />;
  }

  // Show loading state while session is initializing
  if (sessionLoading) {
    return <FullScreenLoader message="Initializing..." />;
  }

  // Show loading state while data is loading (but only if we have a session)
  if (session?.user && !dataLoaded && mode === "APP") {
    return <FullScreenLoader message="Loading your account..." />;
  }

  // Mode === "APP" - render main app
  if (mode !== "APP") {
    // This should never be reached as all modes are handled above
    // But if it is, show loading instead of blank
    return <FullScreenLoader message="Loading..." />;
  }



  // SubView full-screen routing (hides tab bar)
  if (subView === "workout") {
    return (
      <WorkoutTracker
        accentColor={c.accent}
        liftHistory={lifts}
        onBack={() => setSubView(null)}
        onFinish={async (data) => {
          // Save one entry per exercise (the best e1RM set) so Progress shows
          // one data point per workout, not one row per set.
          if (session?.user?.id && data.completedSets?.length) {
            const today = new Date().toISOString().slice(0, 10);
            // Group sets by exercise
            const byExercise = new Map<string, typeof data.completedSets[0]>();
            for (const s of data.completedSets) {
              const prev = byExercise.get(s.exercise);
              const e1rm = (w: number, r: number) => w * (1 + r / 30);
              if (!prev || e1rm(s.weightKg, s.reps) > e1rm(prev.weightKg, prev.reps)) {
                byExercise.set(s.exercise, s);
              }
            }
            await Promise.all(
              Array.from(byExercise.values()).map((s) =>
                insertLift(session.user.id, {
                  id: crypto.randomUUID(),
                  dateISO: today,
                  lift: s.exercise,
                  weightKg: s.weightKg,
                  reps: s.reps,
                  ...(s.rpe != null ? { rpe: s.rpe } : {}),
                }).catch(console.error)
              )
            );
            // Refresh lifts so the Progress tab updates immediately
            fetchLifts(session.user.id).then(setLifts).catch(console.error);
          }
          setSummaryData(data);
          setSubView("summary");
        }}
      />
    );
  }
  if (subView === "summary" && summaryData) {
    return (
      <WorkoutSummary
        data={summaryData}
        onDone={() => { setSubView(null); setSummaryData(null); setTab("Train"); }}
      />
    );
  }
  if (subView === "challenges") {
    return <ChallengesScreen onClose={() => setSubView(null)} />;
  }
  if (subView === "coach" && session) {
    return <CoachPortal onExit={() => setSubView(null)} userId={session.user.id} isAdmin={profileRole === "admin"} />;
  }

  // Header component
  const header = (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: c.accentSoft,
            border: `1px solid ${c.accentBorder}`,
            display: "grid",
            placeItems: "center",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          HM
        </div>
        <div>
          <div className="text-xl font-semibold" style={typography.title}>Hybrid House</div>
          <div className="text-xs mt-1" style={{ color: MUTED }}>
            Monday · {tab}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: c.cardBg2,
            border: `1px solid ${c.border}`,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Bell size={16} color={c.muted} />
        </div>
        <IconButton onClick={() => supabase.auth.signOut()} size="sm">
          <LogOut className="w-4 h-4" stroke="currentColor" strokeWidth={2} style={{ opacity: 0.9 }} />
        </IconButton>
      </div>
    </header>
  );

  // Tab bar component
  const tabBar = (
    <FloatingTabBar
      tabs={[
        { id: "Train",    label: "Train",    icon: <Icon name="train" />    },
        { id: "Progress", label: "Progress", icon: <Icon name="progress" /> },
        { id: "Body",     label: "Body",     icon: <Icon name="body" />     },
        { id: "Badges",   label: "Badges",   icon: <Icon name="badges" />   },
        { id: "Profile",  label: "Profile",  icon: <Icon name="profile" />  },
      ]}
      activeTab={tab}
      onTabChange={(id) => {
        setTab(id as AppTab);
      }}
    />
  );

  return (
    <>
    <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    <AppLayout header={header} tabBar={tabBar}>
      <div className="space-y-4">
          {tab === "Train" ? (
            <div className="space-y-4">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "30px", fontWeight: 700, color: c.text, letterSpacing: "-0.03em", lineHeight: "1.1" }}>
                    Train
                  </div>
                  <div style={{ fontSize: "12px", color: c.muted, marginTop: "4px" }}>
                    Execution over attention.
                  </div>
                </div>
                <SegmentedControl
                  value={range}
                  setValue={setRange}
                  options={[
                    { label: "7d", value: "7" },
                    { label: "30d", value: "30" },
                    { label: "90d", value: "90" },
                    { label: "Year", value: "365" },
                  ]}
                />
              </div>

              <ReadinessCard
                score={readinessScore}
                sleepHours={healthData[0]?.sleepHours ?? 0}
                hrv={Math.max(25, Math.round(80 - (healthData[0]?.avgBPM ?? 60) / 2))}
                restingHr={healthData[0]?.avgBPM ?? 0}
                weeklyVolumeTons={stats.liftedTons}
              />

              {showDeloadBanner ? (
                <GlassCard style={{ background: `${colors.orange}12`, border: `1px solid ${colors.orange}44` }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm">
                      Deload suggested: volume has stayed high for multiple weeks.
                    </div>
                    <button style={{ fontSize: 12, color: MUTED }} onClick={() => setHideDeloadBanner(true)}>
                      Dismiss
                    </button>
                  </div>
                </GlassCard>
              ) : null}

              <StreakCard
                completedDays={streakData.completedDays}
                todayIndex={streakData.todayIndex}
                streakCount={streakData.streakCount}
                streakSub={streakData.streakSub}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <StatTile label="Workouts" value={`${stats.workouts}`} accent />
                <StatTile label="Lifted" value={`${stats.liftedTons.toFixed(1)} t`} />
                <StatTile label="Reps" value={`${stats.reps}`} />
                <StatTile label="Heaviest" value={`${stats.heaviest || 0} kg`} />
                <StatTile label="Time" value={`${stats.timeHrs.toFixed(1)} h`} />
                <StatTile label="Active cals" value={`${stats.activeCals}`} />
              </div>

              <GymChallengesCard
                rankText="You're #4 in Volume King"
                detailText="2 workouts behind #3 this week"
                onClick={() => setSubView("challenges")}
              />

              <DeviceSyncStrip stravaConnected={Boolean(stravaConnection)} />
              <CommunityFeed userId={session!.user.id} userName={profileDisplayName} />
            </div>
          ) : null}

          {tab === "Badges" ? (
            <BadgesScreen accentColor={c.accent} />
          ) : null}

          {tab === "Progress" ? (
            <div className="space-y-4">
              <div style={{ fontSize: "30px", fontWeight: 700, color: c.text, letterSpacing: "-0.03em", lineHeight: "1.1", marginBottom: "20px" }}>
                Progress
              </div>
              <div style={{ fontSize: "12px", color: c.muted, marginTop: "-12px" }}>{progressBreadcrumb}</div>

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
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "14px" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <select
                        value={selectedLift}
                        onChange={e => {
                          const newLift = e.target.value as LiftType;
                          setSelectedLift(newLift);
                          if (liftMetric === "RPE") {
                            const rpeCount = lifts.filter((l) => l.lift === newLift && l.rpe !== undefined).length;
                            if (rpeCount < 3) setLiftMetric("e1RM");
                          }
                        }}
                        style={{
                          width: "100%", appearance: "none", WebkitAppearance: "none",
                          background: c.cardBg2, border: `1px solid ${c.borderMid}`,
                          borderRadius: "12px", padding: "11px 36px 11px 14px",
                          fontSize: "14px", fontWeight: 600, color: c.text,
                          cursor: "pointer", outline: "none", fontFamily: "inherit",
                        }}
                      >
                        {LIFT_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: c.muted }}>▾</div>
                    </div>
                    <div style={{ position: "relative" }}>
                      <select
                        value={progressTimeRange}
                        onChange={e => setProgressTimeRange(e.target.value as "Week" | "Month" | "All-time")}
                        style={{
                          appearance: "none", WebkitAppearance: "none",
                          background: c.cardBg2, border: `1px solid ${c.borderMid}`,
                          borderRadius: "12px", padding: "11px 28px 11px 12px",
                          fontSize: "13px", fontWeight: 500, color: c.muted,
                          cursor: "pointer", outline: "none", fontFamily: "inherit",
                        }}
                      >
                        {["Week", "Month", "All-time"].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <div style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: c.muted }}>▾</div>
                    </div>
                  </div>

                  <SegmentedControl
                    value={liftMetric}
                    setValue={(v) => {
                      const newMetric = v as "e1RM" | "Weight" | "Reps" | "RPE";
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
                              contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: radii.input, color: TEXT }}
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
                        className="px-4 py-2 text-xs font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
                        style={{ borderRadius: radii.pill, background: "rgba(0,0,255,0.15)", border: `1px solid rgba(0,0,255,0.35)`, color: TEXT }}
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
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "14px" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <select
                        value={selectedMachine}
                        onChange={e => setSelectedMachine(e.target.value as CardioMachine)}
                        style={{
                          width: "100%", appearance: "none", WebkitAppearance: "none",
                          background: c.cardBg2, border: `1px solid ${c.borderMid}`, borderRadius: "12px",
                          padding: "11px 36px 11px 14px", fontSize: "14px", fontWeight: 600, color: c.text,
                        }}
                      >
                        {["RowErg", "BikeErg", "SkiErg", "Assault Bike"].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: c.muted }}>▾</div>
                    </div>
                    <div style={{ position: "relative" }}>
                      <select
                        value={progressTimeRange}
                        onChange={e => setProgressTimeRange(e.target.value as "Week" | "Month" | "All-time")}
                        style={{
                          appearance: "none", WebkitAppearance: "none",
                          background: c.cardBg2, border: `1px solid ${c.borderMid}`,
                          borderRadius: "12px", padding: "11px 28px 11px 12px",
                          fontSize: "13px", fontWeight: 500, color: c.muted,
                        }}
                      >
                        {["Week", "Month", "All-time"].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <div style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: c.muted }}>▾</div>
                    </div>
                  </div>

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
                        className="px-4 py-2 text-xs font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
                        style={{ borderRadius: radii.pill, background: "rgba(0,0,255,0.15)", border: `1px solid rgba(0,0,255,0.35)`, color: TEXT }}
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
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "14px" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <select
                        value={String(selectedRunDistance)}
                        onChange={e => setSelectedRunDistance(Number(e.target.value))}
                        style={{
                          width: "100%", appearance: "none", WebkitAppearance: "none",
                          background: c.cardBg2, border: `1px solid ${c.borderMid}`, borderRadius: "12px",
                          padding: "11px 36px 11px 14px", fontSize: "14px", fontWeight: 600, color: c.text,
                        }}
                      >
                        {["200", "400", "600", "800", "1000"].map(d => <option key={d} value={d}>{d}m</option>)}
                      </select>
                      <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: c.muted }}>▾</div>
                    </div>
                    <div style={{ position: "relative" }}>
                      <select
                        value={progressTimeRange}
                        onChange={e => setProgressTimeRange(e.target.value as "Week" | "Month" | "All-time")}
                        style={{
                          appearance: "none", WebkitAppearance: "none",
                          background: c.cardBg2, border: `1px solid ${c.borderMid}`,
                          borderRadius: "12px", padding: "11px 28px 11px 12px",
                          fontSize: "13px", fontWeight: 500, color: c.muted,
                        }}
                      >
                        {["Week", "Month", "All-time"].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <div style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: c.muted }}>▾</div>
                    </div>
                  </div>

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
                            tickFormatter={(v) => `${Number(v).toFixed(1)}`}
                            tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 10 }}
                            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                            tickLine={false}
                            width={44}
                          />
                          <Tooltip
                            contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT }}
                            labelStyle={{ color: MUTED }}
                            formatter={(val: any, _name: any, ctx: any) => [`${Number(val).toFixed(2)} km/h`, `${ctx?.payload?.rounds ?? 1} rounds`]}
                          />
                        <Line type="monotone" dataKey="value" stroke={colors.accent} strokeWidth={2.5} dot={{ r: 3, fill: colors.accent }} activeDot={{ r: 5, fill: colors.accent }} style={{ filter: `drop-shadow(0 2px 4px ${colors.accentGlow})` }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 text-xs" style={{ color: MUTED }}>
                    Higher speed is better (km/h).
                  </div>
                </GlassCard>

                  <Card
                    title="Log run"
                    right={
                      <button
                        onClick={() => setModal({ type: "RUN" })}
                        className="px-4 py-2 text-xs font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
                        style={{ borderRadius: radii.pill, background: "rgba(0,0,255,0.15)", border: `1px solid rgba(0,0,255,0.35)`, color: TEXT }}
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
                            right={pace ? `${(3600 / pace).toFixed(2)} km/h` : "—"}
                          />
                        );
                      })}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {tab === "Body" ? (
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <div style={{ fontSize: "30px", fontWeight: 700, color: c.text, letterSpacing: "-0.03em", lineHeight: "1.1", marginBottom: "20px" }}>Body</div>
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
                    className="px-4 py-2 text-sm font-medium transition-all duration-200"
                    style={{
                      borderRadius: radii.pill,
                      ...(healthPeriod === period
                        ? {
                            background: ACCENT,
                            color: TEXT,
                          }
                        : {
                            background: c.cardBg2,
                            color: MUTED,
                          })
                    }}
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

                const latest = filtered[0]; // healthData is sorted newest-first (index 0 = today)
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
                    <div className="grid grid-cols-3 gap-3">
                      {/* Steps Card */}
                      <div style={{ 
                        background: c.cardBg2,
                        border: `1px solid ${c.border}`,
                        borderRadius: radii.card,
                        padding: spacing.cardPad,
                        boxShadow: shadows.card,
                        minHeight: "100px",
                        display: "flex",
                        flexDirection: "column",
                      }}>
                        {/* Header with icon and title */}
                        <MetricCardHeader
                          icon={
                            <Footprints className="w-6 h-6 sm:w-7 sm:h-7" stroke={ACCENT} strokeWidth={2.5} />
                          }
                          title="Steps"
                        />
                        {/* Body with progress ring */}
                        <div style={{ 
                          flex: 1, 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          marginTop: "8px",
                        }}>
                          <div style={{ position: "relative", width: "44px", height: "44px" }}>
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 56 56" style={{ display: "block", width: "44px", height: "44px" }}>
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
                            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents: "none" }}>
                              <div className="text-xs font-bold leading-tight" style={{ color: TEXT }}>
                                {latest?.steps.toLocaleString() || "0"}
                              </div>
                              <div className="text-[7px] mt-0.5" style={{ color: MUTED }}>
                                {Math.round(stepsProgress * 100)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sleep Card */}
                      <div style={{ 
                        background: c.cardBg2,
                        border: `1px solid ${c.border}`,
                        borderRadius: radii.card,
                        padding: spacing.cardPad,
                        boxShadow: shadows.card,
                      }}>
                        {/* Header with icon and title */}
                        <MetricCardHeader
                          icon={
                            <Moon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />
                          }
                          title="Sleep"
                        />
                        <div style={{ marginTop: "8px" }}>
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
                      </div>

                      {/* Heart Rate Card */}
                      <div style={{ 
                        background: c.cardBg2,
                        border: `1px solid ${c.border}`,
                        borderRadius: radii.card,
                        padding: spacing.cardPad,
                        boxShadow: shadows.card,
                      }}>
                        {/* Header with icon and title */}
                        <MetricCardHeader
                          icon={
                            <Heart className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />
                          }
                          title="Heart"
                        />
                        <div style={{ marginTop: "8px" }}>
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
                          <Footprints className="w-4 h-4" stroke={ACCENT} strokeWidth={2} style={{ opacity: 0.95 }} />
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
                    <div style={{ 
                      background: c.cardBg2,
                      border: `1px solid ${c.border}`,
                      borderRadius: radii.card,
                      padding: spacing.cardPad,
                      boxShadow: shadows.card,
                    }}>
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
                              contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: radii.input, color: TEXT }}
                              labelStyle={{ color: MUTED }}
                              formatter={(val: any) => [`${val.toLocaleString()} steps`, ""]}
                            />
                            <Area type="monotone" dataKey="steps" stroke={ACCENT} strokeWidth={2} fill="url(#stepsArea)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div style={{ 
                      background: c.cardBg2,
                      border: `1px solid ${c.border}`,
                      borderRadius: radii.card,
                      padding: spacing.cardPad,
                      boxShadow: shadows.card,
                    }}>
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
                              contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: radii.input, color: TEXT }}
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

                    <div style={{ 
                      background: c.cardBg2,
                      border: `1px solid ${c.border}`,
                      borderRadius: radii.card,
                      padding: spacing.cardPad,
                      boxShadow: shadows.card,
                    }}>
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
                              contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: radii.input, color: TEXT }}
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
                  <div style={{ fontSize: "30px", fontWeight: 700, color: c.text, letterSpacing: "-0.03em", lineHeight: "1.1", marginBottom: "20px" }}>Profile</div>
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
                    setValue={(v: string) => {
                      setFocus(v as TrainingFocus);
                      if (session?.user?.id) {
                        updateProfile(session.user.id, { training_focus: v as TrainingFocus }).catch(console.error);
                      }
                    }}
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

              <GlassCard>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-base font-semibold" style={{ color: TEXT }}>
                      Strava
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: MUTED }}>
                      {stravaConnection 
                        ? `Connected to Strava${stravaConnection.athlete_name ? ` • ${stravaConnection.athlete_name}` : ''}`
                        : 'Import runs and cardio sessions'}
                    </div>
                  </div>
                </div>

                {stravaConnection ? (
                  <div className="space-y-3">
                    <div className="text-xs" style={{ color: MUTED }}>
                      {stravaConnection.last_sync_at 
                        ? `Last sync: ${formatDateShort(stravaConnection.last_sync_at.split('T')[0])}`
                        : 'Never synced'}
                    </div>
                    <div className="flex gap-2">
                      <PrimaryButton
                        onClick={async () => {
                          setStravaSyncLoading(true);
                          try {
                            const result = await syncStrava();
                            // Reload connection and activities
                            const connection = await fetchStravaConnection();
                            setStravaConnection(connection ? {
                              athlete_name: connection.athlete_name,
                              last_sync_at: connection.last_sync_at,
                            } : null);
                            const activities = await fetchStravaActivities();
                            setStravaActivities(activities);
                            
                            // Show context-aware toast
                            if (result.importedCount > 0) {
                              const lastSyncDate = connection?.last_sync_at 
                                ? formatDateShort(connection.last_sync_at.split('T')[0])
                                : null;
                              showToast({
                                title: 'Strava synced ✅',
                                body: `Imported ${result.importedCount} new activit${result.importedCount === 1 ? 'y' : 'ies'}.${lastSyncDate ? ` Last sync: ${lastSyncDate}` : ''}`,
                                variant: 'success',
                                autoDismiss: true,
                                dismissAfter: 4000,
                              });
                            } else if (result.updatedCount > 0) {
                              showToast({
                                title: 'Strava synced ✅',
                                body: `Updated ${result.updatedCount} activit${result.updatedCount === 1 ? 'y' : 'ies'}.`,
                                variant: 'success',
                                autoDismiss: true,
                                dismissAfter: 3000,
                              });
                            } else {
                              // No new or updated activities
                              showToast({
                                title: "You're up to date",
                                body: 'No new Strava activities since your last sync.',
                                variant: 'info',
                                autoDismiss: false,
                                secondaryAction: {
                                  label: 'Sync last 30 days',
                                  onClick: async () => {
                                    setStravaSyncLoading(true);
                                    try {
                                      // Call sync - API will sync from last_sync_at or default to 30 days
                                      const result = await syncStrava();
                                      const connection = await fetchStravaConnection();
                                      setStravaConnection(connection ? {
                                        athlete_name: connection.athlete_name,
                                        last_sync_at: connection.last_sync_at,
                                      } : null);
                                      const activities = await fetchStravaActivities();
                                      setStravaActivities(activities);
                                      
                                      if (result.importedCount > 0 || result.updatedCount > 0) {
                                        showToast({
                                          title: 'Strava synced ✅',
                                          body: `Found ${result.importedCount + result.updatedCount} activit${result.importedCount + result.updatedCount === 1 ? 'y' : 'ies'}.`,
                                          variant: 'success',
                                          autoDismiss: true,
                                          dismissAfter: 4000,
                                        });
                                      } else {
                                        showToast({
                                          title: 'No activities found',
                                          body: 'No new Strava activities found.',
                                          variant: 'info',
                                          autoDismiss: true,
                                          dismissAfter: 3000,
                                        });
                                      }
                                    } catch (error: any) {
                                      showToast({
                                        title: 'Sync failed',
                                        body: 'Couldn\'t sync Strava right now. Try again in a minute.',
                                        variant: 'error',
                                        autoDismiss: true,
                                        dismissAfter: 4000,
                                      });
                                    } finally {
                                      setStravaSyncLoading(false);
                                    }
                                  },
                                },
                              });
                            }
                          } catch (error: any) {
                            if (error.message?.includes('Rate limit')) {
                              showToast({
                                title: 'Rate limit reached',
                                body: 'Strava rate limit reached. Please try again later.',
                                variant: 'error',
                                autoDismiss: true,
                                dismissAfter: 5000,
                              });
                            } else {
                              showToast({
                                title: 'Sync failed',
                                body: 'Couldn\'t sync Strava right now. Try again in a minute.',
                                variant: 'error',
                                action: {
                                  label: 'Try again',
                                  onClick: async () => {
                                    setStravaSyncLoading(true);
                                    try {
                                      const result = await syncStrava();
                                      const connection = await fetchStravaConnection();
                                      setStravaConnection(connection ? {
                                        athlete_name: connection.athlete_name,
                                        last_sync_at: connection.last_sync_at,
                                      } : null);
                                      const activities = await fetchStravaActivities();
                                      setStravaActivities(activities);
                                      showToast({
                                        title: 'Strava synced ✅',
                                        body: `Imported ${result.importedCount} new activit${result.importedCount === 1 ? 'y' : 'ies'}.`,
                                        variant: 'success',
                                        autoDismiss: true,
                                        dismissAfter: 3000,
                                      });
                                    } catch (retryError: any) {
                                      showToast({
                                        title: 'Sync failed',
                                        body: 'Couldn\'t sync Strava right now. Try again in a minute.',
                                        variant: 'error',
                                        autoDismiss: true,
                                        dismissAfter: 4000,
                                      });
                                    } finally {
                                      setStravaSyncLoading(false);
                                    }
                                  },
                                },
                                autoDismiss: false,
                              });
                            }
                          } finally {
                            setStravaSyncLoading(false);
                          }
                        }}
                        disabled={stravaSyncLoading}
                      >
                        {stravaSyncLoading ? 'Syncing...' : 'Sync now'}
                      </PrimaryButton>
                      <button
                        onClick={async () => {
                          if (!confirm('Disconnect Strava? Your imported activities will remain.')) return;
                          try {
                            await disconnectStrava();
                            setStravaConnection(null);
                            // Keep activities - don't clear them
                          } catch (error: any) {
                            alert(`Disconnect failed: ${error.message || 'Unknown error'}`);
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: radii.pill,
                          color: TEXT,
                          flex: 1,
                        }}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <PrimaryButton
                      onClick={async () => {
                        setStravaLoading(true);
                        try {
                          await connectStrava();
                          // Will redirect, so loading state will be lost
                        } catch (error: any) {
                          setStravaLoading(false);
                          if (error.message?.includes('not configured') || error.message?.includes('env')) {
                            alert('Strava is not configured. Please contact support.');
                          } else {
                            alert(`Connection failed: ${error.message || 'Unknown error'}`);
                          }
                        }
                      }}
                      disabled={stravaLoading}
                    >
                      {stravaLoading ? 'Connecting...' : 'Connect Strava'}
                    </PrimaryButton>
                  </div>
                )}
              </GlassCard>

              <Card title="Data sources">
                <div className="flex flex-wrap gap-2">
                  <Badge>Manual journal</Badge>
                  <Badge>Wearable import</Badge>
                </div>
                <div className="mt-3 text-sm" style={{ color: MUTED }}>
                  Your Overview totals include both manual entries and imported workouts.
                </div>
              </Card>

              {profileRole === "admin" && (
                <button
                  onClick={() => setSubView("coach")}
                  style={{
                    width: "100%", padding: "16px", borderRadius: radii.card,
                    background: c.accentSoft, border: `1px solid ${c.accentBorder}`,
                    display: "flex", alignItems: "center", gap: "12px",
                    cursor: "pointer", fontFamily: "inherit", marginBottom: "4px",
                  }}
                >
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
                    background: c.accentSoft, border: `1px solid ${c.accentBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Users size={20} color={c.accent} />
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: c.text }}>Coach Portal</div>
                    <div style={{ fontSize: "12px", color: c.muted, marginTop: "2px" }}>View member progress</div>
                  </div>
                  <ChevronRight size={16} color={c.muted2} />
                </button>
              )}

              <PrimaryButton onClick={() => supabase.auth.signOut()}>Logout</PrimaryButton>
            </div>
          ) : null}
      </div>
    </AppLayout>

    {/* Add modal chooser */}
    <Modal
        open={modal?.type === "ADD"}
        title="Quick add"
        onClose={() => setModal(null)}
        centered
        maxWidth="sm:max-w-md"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            {
              type: "LIFT" as const,
              icon: <Dumbbell size={20} color="#fff" />,
              iconBg: ACCENT,
              title: "Log lift top set",
              sub: "Weight · reps · RPE",
            },
            {
              type: "CARDIO" as const,
              icon: <Zap size={20} color="#fff" />,
              iconBg: "#f97316",
              title: "Log cardio effort",
              sub: "Calories · machine · time",
            },
            {
              type: "RUN" as const,
              icon: <Footprints size={20} color="#fff" />,
              iconBg: "#22c55e",
              title: "Log a run",
              sub: "Distance · time or pace",
            },
          ].map(({ type, icon, iconBg, title, sub }) => (
            <button
              key={type}
              onClick={() => setModal({ type })}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "14px",
                padding: "14px 16px", textAlign: "left",
                borderRadius: "18px", background: c.cardBg2,
                border: `1px solid ${c.border}`, cursor: "pointer",
                transition: "transform 150ms, border-color 150ms",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = c.borderMid; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = c.border; }}
              onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              <div style={{
                width: "42px", height: "42px", borderRadius: "12px",
                background: iconBg, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: TEXT, lineHeight: 1.3 }}>{title}</div>
                <div style={{ fontSize: "12px", color: MUTED, marginTop: "3px" }}>{sub}</div>
              </div>
              <ChevronRight size={16} color={MUTED} style={{ marginLeft: "auto", flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </Modal>


      {/* Lift modal */}
      <Modal
        open={modal?.type === "LIFT"}
        title="Log lift top set"
        onClose={() => setModal(null)}
        centered
        maxWidth="sm:max-w-md"
      >
        <div className="space-y-4">
          <Input label="Date" value={liftDate} onChange={setLiftDate} type="date" />
          <Select
            label="Lift"
            value={selectedLift}
            onChange={(v) => setSelectedLift(v as LiftType)}
            options={LIFT_OPTIONS}
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
                          background: c.cardBg2,
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
                    background: c.cardBg2,
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
        centered
        maxWidth="sm:max-w-md"
      >
        <div className="space-y-4">
          <Input label="Date" value={cardioDate} onChange={setCardioDate} type="date" />
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
        centered
        maxWidth="sm:max-w-md"
      >
        <div className="space-y-4">
          <Input label="Date" value={runDate} onChange={setRunDate} type="date" />
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
                      background: c.cardBg2, 
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

      <button
        onClick={() => setShowQuickStartSheet(true)}
        style={{
          position: "fixed",
          right: "16px",
          bottom: "calc(var(--tabbar-h, 84px) + var(--tabbar-bottom-offset, 6px) + env(safe-area-inset-bottom, 0px) + 14px)",
          width: "52px",
          height: "52px",
          borderRadius: "999px",
          background: ACCENT,
          color: "#fff",
          boxShadow: `0 4px 20px ${ACCENT}66`,
          zIndex: 60,
          fontSize: "26px",
          lineHeight: 1,
          display: showQuickStartSheet ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        +
      </button>

      <BottomSheet open={showQuickStartSheet} onClose={() => setShowQuickStartSheet(false)} title="Start workout">
        {(() => {
          const allWorkouts = [
            ...lifts.map((l) => ({ dateISO: l.dateISO, label: l.lift })),
            ...cardio.map((c) => ({ dateISO: c.dateISO, label: c.machine })),
            ...runs.map((r) => ({ dateISO: r.dateISO, label: `${r.distanceMeters}m run` })),
            ...imported.map((w) => ({ dateISO: w.dateISO, label: w.workoutType ?? w.source ?? "Workout" })),
          ].sort((a, b) => isoToDate(b.dateISO).getTime() - isoToDate(a.dateISO).getTime());
          const lastSession = allWorkouts[0];

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Start from Scratch — hero card */}
              <button
                onClick={() => { setShowQuickStartSheet(false); setSubView("workout"); }}
                style={{
                  width: "100%", padding: "18px 20px", textAlign: "left",
                  borderRadius: "20px", cursor: "pointer",
                  background: `linear-gradient(135deg, ${ACCENT}22 0%, ${ACCENT}08 100%)`,
                  border: `1px solid ${ACCENT}55`,
                  transition: "transform 150ms, border-color 150ms",
                  display: "flex", alignItems: "center", gap: "16px",
                }}
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
              >
                <div style={{
                  width: "48px", height: "48px", borderRadius: "14px",
                  background: ACCENT, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Play size={22} color="#fff" fill="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>Start from scratch</div>
                  <div style={{ fontSize: "12px", color: MUTED, marginTop: "3px" }}>New empty workout</div>
                </div>
              </button>

              {/* Resume Last Session */}
              <button
                onClick={() => { setShowQuickStartSheet(false); setSubView("workout"); }}
                style={{
                  width: "100%", padding: "16px 20px", textAlign: "left",
                  borderRadius: "20px", cursor: "pointer",
                  background: c.cardBg2,
                  border: `1px solid ${c.border}`,
                  transition: "transform 150ms, border-color 150ms",
                  display: "flex", alignItems: "center", gap: "16px",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = c.borderMid; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = c.border; }}
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
              >
                <div style={{
                  width: "48px", height: "48px", borderRadius: "14px",
                  background: "rgba(255,255,255,0.07)", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <RotateCcw size={20} color={TEXT} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: TEXT, lineHeight: 1.3 }}>Resume last session</div>
                  {lastSession ? (
                    <div style={{ fontSize: "12px", color: MUTED, marginTop: "3px" }}>
                      {lastSession.label} · {lastSession.dateISO}
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: MUTED, marginTop: "3px" }}>No previous session found</div>
                  )}
                </div>
              </button>

              {/* Tools row: Timer + Plate Calc */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  {
                    icon: <Timer size={20} color={TEXT} />,
                    label: "Rest timer",
                    onClick: () => { setShowQuickStartSheet(false); setShowRestSheet(true); },
                  },
                  {
                    icon: <Calculator size={20} color={TEXT} />,
                    label: "Plate calc",
                    onClick: () => { setShowQuickStartSheet(false); setShowPlateSheet(true); },
                  },
                ].map(({ icon, label, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    style={{
                      padding: "14px 12px", borderRadius: "16px", cursor: "pointer",
                      background: c.cardBg2, border: `1px solid ${c.border}`,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                      transition: "transform 150ms",
                    }}
                    onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.96)"; }}
                    onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                  >
                    {icon}
                    <span style={{ fontSize: "12px", fontWeight: 600, color: TEXT }}>{label}</span>
                  </button>
                ))}
              </div>

              {/* From program — coming soon */}
              <button
                disabled
                onClick={() => { setShowQuickStartSheet(false); showToast("Programs coming soon"); }}
                style={{
                  width: "100%", padding: "14px 20px",
                  borderRadius: "16px", cursor: "not-allowed",
                  background: "transparent", border: `1px solid ${c.border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  opacity: 0.5,
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: 500, color: TEXT }}>From program</span>
                <span style={{
                  fontSize: "10px", fontWeight: 700, color: ACCENT,
                  background: `${ACCENT}22`, border: `1px solid ${ACCENT}44`,
                  borderRadius: "999px", padding: "2px 8px", letterSpacing: "0.05em",
                }}>SOON</span>
              </button>
            </div>
          );
        })()}
      </BottomSheet>

      <BottomSheet open={showRestSheet} onClose={() => setShowRestSheet(false)} title="Rest timer">
        <RestTimer defaultSeconds={90} />
      </BottomSheet>

      <BottomSheet open={showPlateSheet} onClose={() => setShowPlateSheet(false)} title="Plate calculator">
        <PlateCalculator onApply={(kg) => { showToast(`Applied ${kg}kg to next set`); setShowPlateSheet(false); }} />
      </BottomSheet>
    </>
  );
}

export default App;
