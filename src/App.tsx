import React, { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, Plus, Footprints, Moon, Heart, Trash2, Trophy, Dumbbell, TrendingUp, Zap, MoreHorizontal, Bell, Users, ChevronRight, Play, RotateCcw, Timer, Calculator, Copy, Check } from "lucide-react";

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
  upsertImportedWorkout,
  fetchHealth,
  fetchBodyMetrics,
  upsertBodyMetric,
} from "./lib/db";
import { calculateBodyComposition } from "./utils/bodyComposition";
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
  stage: string;
  minutes: number;
};

type HealthMetric = {
  dateISO: string;
  steps: number;
  sleepHours: number;
  sleepStages?: SleepStageData[];
  avgBPM: number;
  caloriesBurned: number;
  activeMinutes: number;
  hrvMs?: number | null;
  restingBPM?: number | null;
  vo2Max?: number | null;
  standHours?: number | null;
  respiratoryRate?: number | null;
  mindfulnessMinutes?: number | null;
};

type BodyMetric = {
  id: string;
  dateISO: string;
  weightKg?: number | null;
  heightCm?: number | null;
  neckCm?: number | null;
  bodyFatPct?: number | null;
  leanMassKg?: number | null;
  waistCm?: number | null;
  chestCm?: number | null;
  armsCm?: number | null;
  thighsCm?: number | null;
  hipsCm?: number | null;
  notes?: string | null;
  calculationMethod?: string | null;
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
  const total = totalHours * 60;
  return [
    { stage: "Core",  minutes: Math.round(total * 0.50) },
    { stage: "Deep",  minutes: Math.round(total * 0.20) },
    { stage: "REM",   minutes: Math.round(total * 0.25) },
    { stage: "Awake", minutes: Math.round(total * 0.05) },
  ];
}

function filterHealthByPeriod(data: HealthMetric[], period: '7D' | '1M' | '3M' | '6M' | '1Y'): HealthMetric[] {
  const days = { '7D': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }[period];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = `${cutoff.getFullYear()}-${pad2(cutoff.getMonth() + 1)}-${pad2(cutoff.getDate())}`;
  return data.filter(r => r.dateISO >= cutoffISO);
}

function calcReadiness(data: HealthMetric[]): number {
  if (!data.length) return 0;
  const today = data[0];
  const avg30 = data.slice(0, 30).filter(r => (r.hrvMs ?? 0) > 0);
  const avgHRV = avg30.length ? avg30.reduce((s, r) => s + (r.hrvMs ?? 0), 0) / avg30.length : 0;
  const hrvScore = avgHRV > 0
    ? Math.min(100, Math.round(((today.hrvMs ?? avgHRV) / avgHRV) * 100))
    : 50;
  const sleepScore = Math.min(100, Math.round((today.sleepHours / 8) * 100));
  const activityScore = Math.min(100, Math.round((today.activeMinutes / 30) * 100));
  return Math.round(hrvScore * 0.4 + sleepScore * 0.35 + activityScore * 0.25);
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
  const [profileSyncToken, setProfileSyncToken] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [syncTokenCopied, setSyncTokenCopied] = useState(false);
  const [syncUrlCopied, setSyncUrlCopied] = useState(false);
  const [neonSyncing, setNeonSyncing] = useState(false);
  const [neonResult, setNeonResult] = useState<string | null>(null);
  const [focus, setFocus] = useState<TrainingFocus>(emptyData.focus);
  const [range, setRange] = useState<DateRange>("30");

  const [lifts, setLifts] = useState<LiftEntry[]>(emptyData.lifts);
  const [cardio, setCardio] = useState<CardioEntry[]>(emptyData.cardio);
  const [runs, setRuns] = useState<RunEntry[]>(emptyData.runs);
  const [imported, setImported] = useState<ImportedWorkout[]>(emptyData.imported);
  const [healthData, setHealthData] = useState<HealthMetric[]>(emptyData.health);
  const [healthPeriod, setHealthPeriod] = useState<HealthPeriod>("Daily");
  const [bodyTab, setBodyTab] = useState<'health' | 'body'>('health');
  const [healthChartPeriod, setHealthChartPeriod] = useState<'7D' | '1M' | '3M' | '6M' | '1Y'>('1M');
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetric[]>([]);
  const [showLogBodyModal, setShowLogBodyModal] = useState(false);
  const [bodyLogForm, setBodyLogForm] = useState<Record<string, string>>({
    weightKg: '', heightCm: '', neckCm: '', waistCm: '',
    chestCm: '', armsCm: '', thighsCm: '', hipsCm: '',
    sex: 'male', age: '', notes: '',
  });
  const [showBodyFatOverride, setShowBodyFatOverride] = useState(false);
  const [bodyFatOverrideVal, setBodyFatOverrideVal] = useState('');

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
          setProfileSyncToken(profile.sync_token ?? null);
          if (profile.training_focus) setFocus(profile.training_focus);
        } else {
          // Profile row created by trigger — just set defaults
            setProfileTrainingFocus(null);
          setProfileRole("member");
          setOnboardingComplete(false);
        }

        // 2. Load all data tables in parallel
        const [liftsData, cardioData, runsData, importedData, healthRows, bodyRows] = await Promise.all([
          fetchLifts(userId),
          fetchCardio(userId),
          fetchRuns(userId),
          fetchImported(userId),
          fetchHealth(userId),
          fetchBodyMetrics(userId),
        ]);

        if (cancelled) return;

        setLifts(liftsData as LiftEntry[]);
        setCardio(cardioData as CardioEntry[]);
        setRuns(runsData as RunEntry[]);
        setImported(importedData as ImportedWorkout[]);
        if (healthRows.length > 0) {
          setHealthData(healthRows as HealthMetric[]);
        }
        setBodyMetrics(bodyRows as BodyMetric[]);
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
    if (!healthData.length) return 72;
    return calcReadiness(healthData) || 72;
  }, [healthData]);

  const readinessColor = readinessScore >= 80 ? colors.green : readinessScore >= 60 ? colors.orange : colors.red;
  const showDeloadBanner = !hideDeloadBanner && stats.workouts > 24;

  const liveBodyCalc = useMemo(() => {
    const wt = parseFloat(bodyLogForm.weightKg);
    const ht = parseFloat(bodyLogForm.heightCm);
    if (!wt || !ht) return null;
    const override = bodyFatOverrideVal ? parseFloat(bodyFatOverrideVal) : undefined;
    return calculateBodyComposition({
      weightKg: wt,
      heightCm: ht,
      neckCm: parseFloat(bodyLogForm.neckCm) || 0,
      waistCm: parseFloat(bodyLogForm.waistCm) || 0,
      hipCm: parseFloat(bodyLogForm.hipsCm) || undefined,
      sex: (bodyLogForm.sex as 'male' | 'female') || 'male',
      age: parseFloat(bodyLogForm.age) || 25,
      bodyFatOverride: override,
    });
  }, [bodyLogForm, bodyFatOverrideVal]);

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
      if (!selectedFocus || !session?.user) return;
      
      setSaving(true);
      setSaveError(null);

      try {
        await updateProfile(session.user.id, {
          training_focus: selectedFocus,
          onboarding_complete: false,
        });

        setFocus(selectedFocus);
        setProfileTrainingFocus(selectedFocus);
        setOnboardingComplete(false);
        setMode("WELCOME");
      } catch (err: any) {
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
    <header className="flex items-center justify-end">
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
                hrv={Math.round(healthData[0]?.hrvMs ?? 0)}
                restingHr={healthData[0]?.restingBPM ?? healthData[0]?.avgBPM ?? 0}
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

              <DeviceSyncStrip />
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
              {/* Header with sub-tab switcher */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "30px", fontWeight: 700, color: c.text, letterSpacing: "-0.03em", lineHeight: "1.1" }}>Body</div>
                  <div style={{ fontSize: "12px", color: MUTED, marginTop: "4px" }}>
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                  {(['health', 'body'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setBodyTab(t)}
                      style={{
                        padding: "7px 16px", borderRadius: radii.pill, fontSize: "13px", fontWeight: 600,
                        border: "none", cursor: "pointer",
                        background: bodyTab === t ? ACCENT : "rgba(255,255,255,0.07)",
                        color: bodyTab === t ? "#fff" : MUTED,
                        transition: "all 0.2s",
                      }}
                    >
                      {t === 'health' ? 'Health' : 'Body'}
                    </button>
                  ))}
                </div>
              </div>

              {/* HEALTH SUB-TAB */}
              {bodyTab === 'health' && (() => {
                const filtered = filterHealthByPeriod(healthData, healthChartPeriod);
                const readinessScore = calcReadiness(healthData);
                const today = healthData[0];

                const avgOf = (arr: HealthMetric[], pick: (h: HealthMetric) => number) =>
                  arr.length ? arr.reduce((s, h) => s + pick(h), 0) / arr.length : 0;

                const half = Math.ceil(filtered.length / 2);
                const recent = filtered.slice(0, half);
                const older = filtered.slice(half);
                const pctDelta = (r: number, o: number) => o > 0 ? ((r - o) / o) * 100 : 0;

                const recentAvgSteps = avgOf(recent, h => h.steps);
                const olderAvgSteps = avgOf(older, h => h.steps);
                const recentAvgSleep = avgOf(recent, h => h.sleepHours);
                const olderAvgSleep = avgOf(older, h => h.sleepHours);
                const recentAvgCal = avgOf(recent, h => h.caloriesBurned);
                const olderAvgCal = avgOf(older, h => h.caloriesBurned);
                const recentAvgActive = avgOf(recent, h => h.activeMinutes);
                const olderAvgActive = avgOf(older, h => h.activeMinutes);
                const recentAvgBPM = avgOf(recent, h => h.avgBPM);
                const olderAvgBPM = avgOf(older, h => h.avgBPM);

                const hrvData = filtered.filter(h => (h.hrvMs ?? 0) > 0);
                const avgHRV = avgOf(hrvData, h => h.hrvMs ?? 0);
                const vo2Data = filtered.filter(h => (h.vo2Max ?? 0) > 0);
                const latestVO2 = vo2Data[0]?.vo2Max ?? null;

                const sleepScore = Math.min(100, Math.round(((today?.sleepHours ?? 0) / 8) * 100));
                const activityScore = Math.min(100, Math.round(((today?.activeMinutes ?? 0) / 30) * 100));
                const avg30HRV = healthData.slice(0, 30).filter(h => (h.hrvMs ?? 0) > 0);
                const avgHRV30 = avg30HRV.length ? avg30HRV.reduce((s, h) => s + (h.hrvMs ?? 0), 0) / avg30HRV.length : 0;
                const hrvScore = avgHRV30 > 0
                  ? Math.min(100, Math.round(((today?.hrvMs ?? avgHRV30) / avgHRV30) * 100))
                  : 50;

                type MetricKey = 'steps' | 'sleep' | 'calories' | 'active' | 'hr' | 'restingHr' | 'hrv' | 'vo2';
                const metricCards: Array<{
                  key: MetricKey; label: string; value: string; unit: string;
                  delta: number | null; sparkData: number[]; color: string;
                  higherIsBetter: boolean; show: boolean;
                }> = [
                  { key: 'steps', label: 'STEPS', value: Math.round(recentAvgSteps).toLocaleString(), unit: 'steps/day', delta: older.length ? pctDelta(recentAvgSteps, olderAvgSteps) : null, sparkData: filtered.slice(-14).map(h => h.steps), color: ACCENT, higherIsBetter: true, show: true },
                  { key: 'sleep', label: 'SLEEP', value: recentAvgSleep.toFixed(1), unit: 'hrs/night', delta: older.length ? pctDelta(recentAvgSleep, olderAvgSleep) : null, sparkData: filtered.slice(-14).map(h => h.sleepHours), color: '#9B59B6', higherIsBetter: true, show: true },
                  { key: 'calories', label: 'CALORIES', value: Math.round(recentAvgCal).toLocaleString(), unit: 'kcal/day', delta: older.length ? pctDelta(recentAvgCal, olderAvgCal) : null, sparkData: filtered.slice(-14).map(h => h.caloriesBurned), color: '#f97316', higherIsBetter: true, show: true },
                  { key: 'active', label: 'ACTIVE MINS', value: Math.round(recentAvgActive).toString(), unit: 'min/day', delta: older.length ? pctDelta(recentAvgActive, olderAvgActive) : null, sparkData: filtered.slice(-14).map(h => h.activeMinutes), color: '#22c55e', higherIsBetter: true, show: true },
                  { key: 'hr', label: 'AVG HEART RATE', value: Math.round(recentAvgBPM).toString(), unit: 'bpm', delta: older.length ? pctDelta(recentAvgBPM, olderAvgBPM) : null, sparkData: filtered.slice(-14).map(h => h.avgBPM), color: '#ef4444', higherIsBetter: false, show: recentAvgBPM > 0 },
                  { key: 'restingHr', label: 'RESTING HR', value: today?.restingBPM != null ? Math.round(today.restingBPM).toString() : '—', unit: 'bpm', delta: null, sparkData: filtered.filter(h => h.restingBPM != null).slice(-14).map(h => h.restingBPM ?? 0), color: '#f43f5e', higherIsBetter: false, show: filtered.some(h => (h.restingBPM ?? 0) > 0) },
                  { key: 'hrv', label: 'HRV', value: avgHRV > 0 ? Math.round(avgHRV).toString() : '—', unit: 'ms', delta: null, sparkData: hrvData.slice(-14).map(h => h.hrvMs ?? 0), color: '#38bdf8', higherIsBetter: true, show: hrvData.length > 0 },
                  { key: 'vo2', label: 'VO₂ MAX', value: latestVO2 != null ? latestVO2.toFixed(1) : '—', unit: 'ml/kg/min', delta: null, sparkData: vo2Data.slice(-14).map(h => h.vo2Max ?? 0), color: '#a78bfa', higherIsBetter: true, show: vo2Data.length > 0 },
                ];
                const visibleCards = metricCards.filter(m => m.show);

                const expandedCard = visibleCards.find(m => m.key === expandedMetric);
                const expandedChartData = expandedCard
                  ? filtered.map(h => ({
                      dateISO: h.dateISO,
                      value: expandedCard.key === 'steps' ? h.steps
                        : expandedCard.key === 'sleep' ? h.sleepHours
                        : expandedCard.key === 'calories' ? h.caloriesBurned
                        : expandedCard.key === 'active' ? h.activeMinutes
                        : expandedCard.key === 'hr' ? h.avgBPM
                        : expandedCard.key === 'restingHr' ? (h.restingBPM ?? 0)
                        : expandedCard.key === 'hrv' ? (h.hrvMs ?? 0)
                        : (h.vo2Max ?? 0),
                    })).reverse()
                  : [];

                return (
                  <>
                    {/* Readiness Hero */}
                    <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "20px", boxShadow: shadows.card }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                        <div style={{ position: "relative", width: "92px", height: "92px", flexShrink: 0 }}>
                          <svg viewBox="0 0 92 92" style={{ width: "92px", height: "92px", transform: "rotate(-90deg)" }}>
                            <circle cx="46" cy="46" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                            <circle cx="46" cy="46" r="40" fill="none" stroke={ACCENT} strokeWidth="7"
                              strokeDasharray={`${2 * Math.PI * 40}`}
                              strokeDashoffset={`${2 * Math.PI * 40 * (1 - readinessScore / 100)}`}
                              strokeLinecap="round"
                              style={{ transition: "stroke-dashoffset 0.6s ease" }}
                            />
                          </svg>
                          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ fontSize: "26px", fontWeight: 800, color: TEXT, lineHeight: 1 }}>{readinessScore}</div>
                            <div style={{ fontSize: "9px", color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ready</div>
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "15px", fontWeight: 700, color: TEXT, marginBottom: "12px" }}>Readiness</div>
                          {[
                            { label: 'HRV', score: hrvScore, color: '#38bdf8' },
                            { label: 'Sleep', score: sleepScore, color: '#9B59B6' },
                            { label: 'Activity', score: activityScore, color: '#22c55e' },
                          ].map(({ label, score, color }) => (
                            <div key={label} style={{ marginBottom: "9px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "11px", color: MUTED }}>{label}</span>
                                <span style={{ fontSize: "11px", fontWeight: 600, color: TEXT }}>{score}</span>
                              </div>
                              <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.06)" }}>
                                <div style={{ height: "4px", borderRadius: "2px", background: color, width: `${clamp(score, 0, 100)}%`, transition: "width 0.5s ease" }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Period Selector */}
                    <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
                      {(['7D', '1M', '3M', '6M', '1Y'] as const).map(p => (
                        <button key={p} onClick={() => { setHealthChartPeriod(p); setExpandedMetric(null); }} style={{ padding: "6px 14px", borderRadius: radii.pill, fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer", flexShrink: 0, background: healthChartPeriod === p ? ACCENT : "rgba(255,255,255,0.06)", color: healthChartPeriod === p ? "#fff" : MUTED, transition: "all 0.2s" }}>
                          {p}
                        </button>
                      ))}
                    </div>

                    {/* Expanded chart panel */}
                    {expandedMetric && expandedCard && (
                      <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "16px", boxShadow: shadows.card }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: TEXT }}>{expandedCard.label}</div>
                          <button onClick={() => setExpandedMetric(null)} style={{ background: "rgba(255,255,255,0.07)", border: "none", cursor: "pointer", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: "14px" }}>✕</button>
                        </div>
                        <div style={{ height: "160px" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={expandedChartData} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
                              <defs>
                                <linearGradient id="expandedGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={expandedCard.color} stopOpacity={0.35} />
                                  <stop offset="100%" stopColor={expandedCard.color} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                              <XAxis dataKey="dateISO" tickFormatter={formatDateShort} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                              <Tooltip contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: "8px", color: TEXT }} labelStyle={{ color: MUTED }} formatter={(val: any) => [`${typeof val === 'number' ? val.toLocaleString() : val} ${expandedCard.unit}`, '']} />
                              <Area type="monotone" dataKey="value" stroke={expandedCard.color} strokeWidth={2} fill="url(#expandedGrad)" dot={false} isAnimationActive={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Metric cards grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {visibleCards.map(m => {
                        const isExpanded = expandedMetric === m.key;
                        const sparkPoints = m.sparkData.filter(v => v > 0);
                        const sparkChartData = m.sparkData.map((v, i) => ({ i, v }));
                        return (
                          <div key={m.key} onClick={() => setExpandedMetric(isExpanded ? null : m.key)} style={{ background: c.cardBg2, border: `1px solid ${isExpanded ? m.color + '55' : c.border}`, borderRadius: "14px", padding: "14px", cursor: "pointer", transition: "all 0.2s", boxShadow: isExpanded ? `0 0 0 1px ${m.color}33` : shadows.card }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                              <div style={{ fontSize: "10px", fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</div>
                              {m.delta !== null && (
                                <div style={{ fontSize: "10px", fontWeight: 700, color: (m.higherIsBetter ? m.delta >= 0 : m.delta <= 0) ? '#22c55e' : '#ef4444', background: (m.higherIsBetter ? m.delta >= 0 : m.delta <= 0) ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', padding: "2px 5px", borderRadius: "4px" }}>
                                  {m.delta >= 0 ? '↑' : '↓'} {Math.abs(m.delta).toFixed(1)}%
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
                              <span style={{ fontSize: "26px", fontWeight: 800, color: TEXT, lineHeight: 1 }}>{m.value}</span>
                              <span style={{ fontSize: "11px", color: MUTED }}>{m.unit}</span>
                            </div>
                            {sparkPoints.length > 1 && (
                              <div style={{ height: "38px", margin: "0 -4px" }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={sparkChartData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
                                    <Line type="monotone" dataKey="v" stroke={m.color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Sleep stages chart */}
                    {(() => {
                      const weekData = healthData.slice(0, 7).filter(h => h.sleepStages && h.sleepStages.length > 0);
                      if (!weekData.length) return null;
                      const chartData = weekData.map(h => {
                        const stageMap: Record<string, number> = {};
                        (h.sleepStages ?? []).forEach(s => { stageMap[s.stage] = s.minutes; });
                        return { dateISO: h.dateISO, Deep: stageMap['Deep'] ?? 0, Core: stageMap['Core'] ?? 0, REM: stageMap['REM'] ?? 0, Awake: stageMap['Awake'] ?? 0 };
                      }).reverse();
                      return (
                        <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: spacing.cardPad, boxShadow: shadows.card }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: TEXT }}>Sleep Stages</div>
                            <div style={{ display: "flex", gap: "10px" }}>
                              {[{ l: 'Deep', c: ACCENT }, { l: 'Core', c: '#9B59B6' }, { l: 'REM', c: '#E91E63' }, { l: 'Awake', c: '#FFC107' }].map(({ l, c: col }) => (
                                <div key={l} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <div style={{ width: "7px", height: "7px", borderRadius: "2px", background: col }} />
                                  <span style={{ fontSize: "10px", color: MUTED }}>{l}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div style={{ height: "140px" }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="slpDeep" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACCENT} stopOpacity={0.8} /><stop offset="100%" stopColor={ACCENT} stopOpacity={0.3} /></linearGradient>
                                  <linearGradient id="slpCore" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9B59B6" stopOpacity={0.8} /><stop offset="100%" stopColor="#9B59B6" stopOpacity={0.3} /></linearGradient>
                                  <linearGradient id="slpREM" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E91E63" stopOpacity={0.8} /><stop offset="100%" stopColor="#E91E63" stopOpacity={0.3} /></linearGradient>
                                  <linearGradient id="slpAwake" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFC107" stopOpacity={0.8} /><stop offset="100%" stopColor="#FFC107" stopOpacity={0.3} /></linearGradient>
                                </defs>
                                <XAxis dataKey="dateISO" tickFormatter={formatDateShort} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: "8px", color: TEXT }} formatter={(val: any, name: string) => [`${Math.round(val)} min`, name]} />
                                <Area type="monotone" dataKey="Deep" stackId="1" stroke={ACCENT} fill="url(#slpDeep)" strokeWidth={1} isAnimationActive={false} />
                                <Area type="monotone" dataKey="Core" stackId="1" stroke="#9B59B6" fill="url(#slpCore)" strokeWidth={1} isAnimationActive={false} />
                                <Area type="monotone" dataKey="REM" stackId="1" stroke="#E91E63" fill="url(#slpREM)" strokeWidth={1} isAnimationActive={false} />
                                <Area type="monotone" dataKey="Awake" stackId="1" stroke="#FFC107" fill="url(#slpAwake)" strokeWidth={1} isAnimationActive={false} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Recent imported workouts */}
                    {imported.length > 0 && (
                      <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: spacing.cardPad, boxShadow: shadows.card }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: TEXT, marginBottom: "12px" }}>Recent Workouts</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {imported.slice(0, 5).map(w => (
                            <div key={w.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div style={{ width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0, background: "rgba(0,0,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                                {w.workoutType === 'Strength' ? '🏋️' : w.workoutType === 'Cardio' ? '🚴' : '🏃'}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "13px", fontWeight: 600, color: TEXT }}>{w.workoutType}</div>
                                <div style={{ fontSize: "11px", color: MUTED }}>{formatDateShort(w.dateISO)} · {w.minutes} min{w.activeCalories ? ` · ${w.activeCalories} kcal` : ''}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* BODY COMP SUB-TAB */}
              {bodyTab === 'body' && (() => {
                const latest = bodyMetrics[0];

                // Resolve body fat and lean mass — use stored value if present,
                // otherwise calculate on-the-fly from whatever measurements exist
                const resolvedBF = (() => {
                  if (latest?.bodyFatPct != null) return { value: latest.bodyFatPct, estimated: false };
                  if (latest?.weightKg && latest?.heightCm) {
                    const calc = calculateBodyComposition({
                      weightKg: latest.weightKg,
                      heightCm: latest.heightCm,
                      neckCm: latest.neckCm ?? 0,
                      waistCm: latest.waistCm ?? 0,
                      hipCm: latest.hipsCm ?? undefined,
                      sex: 'male',
                      age: 30,
                    });
                    return { value: calc.bodyFatPercent, estimated: true };
                  }
                  return null;
                })();
                const resolvedLM = (() => {
                  if (latest?.leanMassKg != null) return { value: latest.leanMassKg, estimated: false };
                  if (resolvedBF && latest?.weightKg) {
                    return { value: Math.round((latest.weightKg * (1 - resolvedBF.value / 100)) * 10) / 10, estimated: resolvedBF.estimated };
                  }
                  return null;
                })();

                const bmi = (latest?.weightKg != null && latest?.heightCm != null && latest.heightCm > 0)
                  ? latest.weightKg / ((latest.heightCm / 100) ** 2) : null;
                const bmiPct = bmi != null ? clamp(((bmi - 15) / 25) * 100, 0, 100) : null;
                const weightChartData = bodyMetrics.slice(0, 30).map(b => ({ dateISO: b.dateISO, value: b.weightKg ?? 0 })).filter(d => d.value > 0).reverse();
                const bfChartData = bodyMetrics.slice(0, 30).map(b => ({ dateISO: b.dateISO, value: b.bodyFatPct ?? 0 })).filter(d => d.value > 0).reverse();

                const openLogModal = () => {
                  const prev = bodyMetrics[0];
                  setBodyLogForm({
                    weightKg: prev?.weightKg?.toString() ?? '',
                    heightCm: prev?.heightCm?.toString() ?? '',
                    neckCm: prev?.neckCm?.toString() ?? '',
                    waistCm: prev?.waistCm?.toString() ?? '',
                    chestCm: prev?.chestCm?.toString() ?? '',
                    armsCm: prev?.armsCm?.toString() ?? '',
                    thighsCm: prev?.thighsCm?.toString() ?? '',
                    hipsCm: prev?.hipsCm?.toString() ?? '',
                    sex: 'male',
                    age: '',
                    notes: '',
                  });
                  setShowBodyFatOverride(false);
                  setBodyFatOverrideVal('');
                  setShowLogBodyModal(true);
                };

                return (
                  <>
                    {bodyMetrics.length === 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", textAlign: "center" }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: TEXT, marginBottom: "8px" }}>No body data yet</div>
                        <div style={{ fontSize: "14px", color: MUTED, marginBottom: "24px", maxWidth: "240px", lineHeight: 1.6 }}>
                          Log your first body composition entry to start tracking your progress.
                        </div>
                        <button onClick={openLogModal} style={{ padding: "12px 28px", borderRadius: radii.pill, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
                          Log First Entry
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Key stats row */}
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'WEIGHT', value: latest?.weightKg != null ? latest.weightKg.toFixed(1) : '—', unit: 'kg', est: false },
                            { label: 'BODY FAT', value: resolvedBF ? resolvedBF.value.toFixed(1) : '—', unit: '%', est: resolvedBF?.estimated ?? false },
                            { label: 'LEAN MASS', value: resolvedLM ? resolvedLM.value.toFixed(1) : '—', unit: 'kg', est: resolvedLM?.estimated ?? false },
                          ].map(({ label, value, unit, est }) => (
                            <div key={label} style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: "14px", padding: "14px", boxShadow: shadows.card }}>
                              <div style={{ fontSize: "10px", fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>{label}{est && <span style={{ fontSize: "9px", color: MUTED, fontWeight: 400, marginLeft: "4px" }}>est.</span>}</div>
                              <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                                <span style={{ fontSize: "20px", fontWeight: 800, color: TEXT }}>{value}</span>
                                <span style={{ fontSize: "11px", color: MUTED }}>{unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* BMI indicator */}
                        {bmi != null && (
                          <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: "16px", boxShadow: shadows.card }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: TEXT }}>BMI</div>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: TEXT }}>{bmi.toFixed(1)} — {bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'Obese'}</div>
                            </div>
                            <div style={{ position: "relative", height: "10px", borderRadius: "5px", overflow: "hidden", display: "flex" }}>
                              <div style={{ flex: 1, background: "#38bdf8" }} />
                              <div style={{ flex: 2.5, background: "#22c55e" }} />
                              <div style={{ flex: 2, background: "#f97316" }} />
                              <div style={{ flex: 1.5, background: "#ef4444" }} />
                            </div>
                            {bmiPct != null && (
                              <div style={{ position: "relative", height: "10px" }}>
                                <div style={{ position: "absolute", left: `${bmiPct}%`, transform: "translateX(-50%) translateY(-50%)", width: "14px", height: "14px", background: TEXT, borderRadius: "50%", border: `2px solid ${c.cardBg2}`, transition: "left 0.4s ease" }} />
                              </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                              {[{ l: 'Under', v: '< 18.5', col: '#38bdf8' }, { l: 'Healthy', v: '18.5–25', col: '#22c55e' }, { l: 'Over', v: '25–30', col: '#f97316' }, { l: 'Obese', v: '≥ 30', col: '#ef4444' }].map(z => (
                                <div key={z.l} style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: "9px", fontWeight: 600, color: z.col }}>{z.l}</div>
                                  <div style={{ fontSize: "9px", color: MUTED }}>{z.v}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Weight trend */}
                        {weightChartData.length > 1 && (
                          <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: spacing.cardPad, boxShadow: shadows.card }}>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: TEXT, marginBottom: "12px" }}>Weight Trend</div>
                            <div style={{ height: "140px" }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={weightChartData} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="wtGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                                      <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                                  <XAxis dataKey="dateISO" tickFormatter={formatDateShort} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} />
                                  <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} width={36} domain={['auto', 'auto']} />
                                  <Tooltip contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: "8px", color: TEXT }} formatter={(val: any) => [`${val} kg`, 'Weight']} />
                                  <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} fill="url(#wtGrad)" dot={false} isAnimationActive={false} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* Body fat trend */}
                        {bfChartData.length > 1 && (
                          <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: spacing.cardPad, boxShadow: shadows.card }}>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: TEXT, marginBottom: "12px" }}>Body Fat %</div>
                            <div style={{ height: "120px" }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={bfChartData} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
                                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                                  <XAxis dataKey="dateISO" tickFormatter={formatDateShort} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} />
                                  <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} axisLine={false} tickLine={false} width={36} domain={['auto', 'auto']} />
                                  <Tooltip contentStyle={{ background: "rgba(10,10,14,0.95)", border: `1px solid ${BORDER}`, borderRadius: "8px", color: TEXT }} formatter={(val: any) => [`${val}%`, 'Body Fat']} />
                                  <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} isAnimationActive={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* Measurements grid */}
                        {latest && [latest.waistCm, latest.chestCm, latest.armsCm, latest.thighsCm, latest.hipsCm].some(v => v != null) && (
                          <div style={{ background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: radii.card, padding: spacing.cardPad, boxShadow: shadows.card }}>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: TEXT, marginBottom: "12px" }}>Measurements</div>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { label: 'Waist', value: latest.waistCm },
                                { label: 'Chest', value: latest.chestCm },
                                { label: 'Arms', value: latest.armsCm },
                                { label: 'Thighs', value: latest.thighsCm },
                                { label: 'Hips', value: latest.hipsCm },
                              ].filter(m => m.value != null).map(({ label, value }) => (
                                <div key={label} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: `1px solid ${BORDER}` }}>
                                  <div style={{ fontSize: "10px", color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>{label}</div>
                                  <div style={{ fontSize: "18px", fontWeight: 700, color: TEXT }}>{value}<span style={{ fontSize: "11px", color: MUTED }}> cm</span></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Log entry button */}
                    <button onClick={openLogModal} style={{ width: "100%", padding: "14px", borderRadius: radii.pill, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
                      {bodyMetrics.length === 0 ? 'Log First Entry' : 'Log New Entry'}
                    </button>
                  </>
                );
              })()}

              {/* BODY LOG MODAL */}
              {showLogBodyModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setShowLogBodyModal(false)}>
                  <div style={{ width: "100%", maxWidth: "480px", background: c.cardBg2, border: `1px solid ${c.border}`, borderRadius: "24px 24px 0 0", padding: "24px", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: TEXT }}>Log Body Entry</div>
                      <button onClick={() => setShowLogBodyModal(false)} style={{ background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", borderRadius: "50%", width: "32px", height: "32px", color: MUTED, fontSize: "16px" }}>✕</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {/* Sex + Age row */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: MUTED, marginBottom: "6px" }}>Sex</div>
                          <div style={{ display: "flex", borderRadius: "10px", overflow: "hidden", border: `1px solid ${BORDER}` }}>
                            {(['male', 'female'] as const).map(s => (
                              <button key={s} onClick={() => setBodyLogForm(f => ({ ...f, sex: s }))} style={{ flex: 1, padding: "10px", background: bodyLogForm.sex === s ? ACCENT : "rgba(255,255,255,0.04)", color: bodyLogForm.sex === s ? "#fff" : MUTED, border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, textTransform: "capitalize", fontFamily: "inherit" }}>{s}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: MUTED, marginBottom: "6px" }}>Age</div>
                          <input type="number" value={bodyLogForm.age} onChange={e => setBodyLogForm(f => ({ ...f, age: e.target.value }))} placeholder="25" style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                        </div>
                      </div>
                      {/* Weight + Height row */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        {[{ key: 'weightKg', label: 'Weight (kg)', placeholder: '75.0' }, { key: 'heightCm', label: 'Height (cm)', placeholder: '180' }].map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: MUTED, marginBottom: "6px" }}>{label}</div>
                            <input type="number" value={bodyLogForm[key]} onChange={e => setBodyLogForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                          </div>
                        ))}
                      </div>
                      {/* Measurements */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        {[
                          { key: 'neckCm', label: 'Neck (cm)', placeholder: '38' },
                          { key: 'waistCm', label: 'Waist (cm)', placeholder: '85' },
                          { key: 'hipsCm', label: 'Hips (cm)', placeholder: '95' },
                          { key: 'chestCm', label: 'Chest (cm)', placeholder: '100' },
                          { key: 'armsCm', label: 'Arms (cm)', placeholder: '35' },
                          { key: 'thighsCm', label: 'Thighs (cm)', placeholder: '55' },
                        ].map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: MUTED, marginBottom: "6px" }}>{label}</div>
                            <input type="number" value={bodyLogForm[key]} onChange={e => setBodyLogForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                          </div>
                        ))}
                      </div>

                      {/* Live calculated results card */}
                      <div style={{ background: "#141414", border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "16px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "14px" }}>Calculated</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                          {[
                            { label: 'Body Fat', value: liveBodyCalc ? `${liveBodyCalc.bodyFatPercent}` : '—', unit: '%' },
                            { label: 'Lean Mass', value: liveBodyCalc ? `${liveBodyCalc.leanMassKg}` : '—', unit: 'kg' },
                            { label: 'BMI', value: liveBodyCalc ? `${liveBodyCalc.bmi}` : '—', unit: '' },
                          ].map(({ label, value, unit }) => (
                            <div key={label} style={{ textAlign: "center" }}>
                              <div style={{ fontSize: "10px", color: MUTED, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                              <div style={{ fontSize: "22px", fontWeight: 800, color: TEXT, lineHeight: 1 }}>{value}<span style={{ fontSize: "13px", color: MUTED, fontWeight: 400, marginLeft: "2px" }}>{unit}</span></div>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: "11px", color: MUTED, marginBottom: "10px" }}>
                          {liveBodyCalc ? `Method: ${liveBodyCalc.method === 'navy' ? 'US Navy' : liveBodyCalc.method === 'deurenberg' ? 'Deurenberg (BMI-based)' : 'Manual entry'}` : 'Enter weight and neck to calculate'}
                        </div>
                        <button onClick={() => setShowBodyFatOverride(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: MUTED, textDecoration: "underline", padding: 0, fontFamily: "inherit" }}>
                          {showBodyFatOverride ? 'Use auto-calculation' : '↓ Override Body Fat % (DEXA / InBody)'}
                        </button>
                        {showBodyFatOverride && (
                          <div style={{ marginTop: "10px" }}>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: MUTED, marginBottom: "6px" }}>Body Fat % (manual)</div>
                            <input type="number" value={bodyFatOverrideVal} onChange={e => setBodyFatOverrideVal(e.target.value)} placeholder="e.g. 14.2" style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                          </div>
                        )}
                        <div style={{ marginTop: "10px", fontSize: "11px", color: MUTED, lineHeight: 1.5 }}>
                          Estimates use the US Navy method. For clinical accuracy, use DEXA and tap Override.
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: MUTED, marginBottom: "6px" }}>Notes</div>
                        <textarea value={bodyLogForm['notes']} onChange={e => setBodyLogForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." rows={2} style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, fontSize: "14px", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!session?.user?.id) return;
                        const entry = {
                          dateISO: todayISO(),
                          weightKg: bodyLogForm.weightKg ? Number(bodyLogForm.weightKg) : null,
                          heightCm: bodyLogForm.heightCm ? Number(bodyLogForm.heightCm) : null,
                          neckCm: bodyLogForm.neckCm ? Number(bodyLogForm.neckCm) : null,
                          bodyFatPct: liveBodyCalc?.bodyFatPercent ?? null,
                          leanMassKg: liveBodyCalc?.leanMassKg ?? null,
                          waistCm: bodyLogForm.waistCm ? Number(bodyLogForm.waistCm) : null,
                          chestCm: bodyLogForm.chestCm ? Number(bodyLogForm.chestCm) : null,
                          armsCm: bodyLogForm.armsCm ? Number(bodyLogForm.armsCm) : null,
                          thighsCm: bodyLogForm.thighsCm ? Number(bodyLogForm.thighsCm) : null,
                          hipsCm: bodyLogForm.hipsCm ? Number(bodyLogForm.hipsCm) : null,
                          notes: bodyLogForm.notes || null,
                          calculationMethod: liveBodyCalc?.method ?? null,
                        };
                        try {
                          await upsertBodyMetric(session.user.id, entry);
                          const fresh = await fetchBodyMetrics(session.user.id);
                          setBodyMetrics(fresh as BodyMetric[]);
                          setShowLogBodyModal(false);
                          setShowBodyFatOverride(false);
                          setBodyFatOverrideVal('');
                          showToast('Entry saved!', 'success');
                        } catch (err) {
                          console.error(err);
                          showToast('Failed to save. Please try again.', 'error');
                        }
                      }}
                      style={{ width: "100%", marginTop: "20px", padding: "14px", borderRadius: radii.pill, background: ACCENT, color: "#fff", border: "none", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}
                    >
                      Save Entry
                    </button>
                  </div>
                </div>
              )}

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



              <Card title="Data sources">
                <div className="flex flex-wrap gap-2">
                  <Badge>Manual journal</Badge>
                  <Badge>Wearable import</Badge>
                </div>
                <div className="mt-3 text-sm" style={{ color: MUTED }}>
                  Your Overview totals include both manual entries and imported workouts.
                </div>
              </Card>

              {/* Apple Health Sync setup */}
              <GlassCard>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "10px", flexShrink: 0,
                    background: c.accentSoft, border: `1px solid ${c.accentBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Heart size={18} color={c.accent} />
                  </div>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: TEXT }}>Apple Health Sync</div>
                    <div style={{ fontSize: "12px", color: MUTED, marginTop: "1px" }}>
                      {healthData[0]?.dateISO
                        ? `Last synced ${healthData[0].dateISO}`
                        : "Not yet synced"}
                    </div>
                  </div>
                </div>

                {/* How to connect HealthBridge */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${c.border}`, borderRadius: "12px", padding: "14px", marginBottom: "14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>How to connect HealthBridge</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {[
                      { n: '1', text: 'Download the HealthBridge app on your iPhone' },
                      { n: '2', text: 'Open HealthBridge → Settings → Database' },
                      { n: '3', text: 'Paste the connection URL below into HealthBridge' },
                      { n: '4', text: 'HealthBridge syncs automatically — tap "Sync from HealthBridge" below to pull data into the app' },
                    ].map(({ n, text }) => (
                      <div key={n} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: c.accentSoft, border: `1px solid ${c.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "11px", fontWeight: 700, color: TEXT }}>{n}</div>
                        <div style={{ fontSize: "13px", color: MUTED, lineHeight: 1.5 }}>{text}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "12px", fontSize: "12px", color: MUTED, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: TEXT }}>Syncs: </span>
                    Steps · Sleep · Heart Rate · HRV · Calories · Active Minutes · Workouts · VO₂ Max · Resting HR
                  </div>
                </div>

                {/* Sync from Neon button */}
                <div style={{ marginBottom: "14px" }}>
                  <button
                    onClick={async () => {
                      setNeonSyncing(true);
                      setNeonResult(null);
                      try {
                        const { data, error } = await supabase.functions.invoke("sync-from-neon");
                        if (error) throw error;
                        setNeonResult(`Synced ${data?.synced ?? 0} days`);
                        const fresh = await fetchHealth(session!.user.id);
                        if (fresh.length > 0) setHealthData(fresh);
                      } catch (e: any) {
                        setNeonResult(`Error: ${e?.message ?? "unknown"}`);
                      }
                      setNeonSyncing(false);
                    }}
                    disabled={neonSyncing}
                    style={{
                      width: "100%", padding: "11px", borderRadius: "10px",
                      background: c.accent, color: "#fff", border: "none",
                      fontWeight: 600, fontSize: "14px", cursor: neonSyncing ? "default" : "pointer",
                      opacity: neonSyncing ? 0.6 : 1,
                    }}
                  >
                    {neonSyncing ? "Syncing…" : "Sync from HealthBridge"}
                  </button>
                  {neonResult && (
                    <div style={{ fontSize: "12px", color: MUTED, marginTop: "6px", textAlign: "center" }}>
                      {neonResult}
                    </div>
                  )}
                </div>

                {/* Database URL row */}
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                    Database URL
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    background: "rgba(255,255,255,0.04)", border: `1px solid ${c.border}`,
                    borderRadius: "10px", padding: "10px 12px",
                  }}>
                    <span style={{ flex: 1, fontSize: "11px", color: TEXT, fontFamily: "monospace", wordBreak: "break-all" }}>
                      postgresql://neondb_owner:npg_X4unfTV5Qysr@ep-tiny-water-ap48hjjd.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("postgresql://neondb_owner:npg_X4unfTV5Qysr@ep-tiny-water-ap48hjjd.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require");
                        setSyncUrlCopied(true);
                        setTimeout(() => setSyncUrlCopied(false), 2000);
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", flexShrink: 0, color: syncUrlCopied ? c.green : MUTED }}
                    >
                      {syncUrlCopied ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>
              </GlassCard>

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
