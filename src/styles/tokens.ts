// Design Tokens - Premium Futuristic UI
// Single source of truth for consistent design system

export const colors = {
  bg: "#060608",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.5)",
  muted2: "rgba(255,255,255,0.25)",
  surface: "#0E0E12",
  cardBg: "#0E0E12",
  cardBg2: "#141418",
  border: "rgba(255,255,255,0.08)",
  borderMid: "rgba(255,255,255,0.14)",
  accent: "#0000FF",
  accentGlow: "rgba(0,0,255,0.18)",
  accentSoft: "rgba(0,0,255,0.08)",
  accentBorder: "rgba(0,0,255,0.3)",
  green: "#22c55e",
  orange: "#f97316",
} as const;

export const lightColors = {
  bg: "#F0EFE9",
  text: "#0A0A0F",
  muted: "rgba(10,10,15,0.5)",
  muted2: "rgba(10,10,15,0.3)",
  surface: "#FFFFFF",
  cardBg: "#FFFFFF",
  cardBg2: "#F8F7F2",
  border: "rgba(10,10,15,0.1)",
  borderMid: "rgba(10,10,15,0.18)",
  accent: "#0000CC",
  accentGlow: "rgba(0,0,204,0.15)",
  accentSoft: "rgba(0,0,204,0.08)",
  accentBorder: "rgba(0,0,204,0.3)",
  green: "#16a34a",
  orange: "#ea580c",
} as const;

// Standardized radius tokens
export const radii = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "22px",
  "3xl": "28px",
  full: "999px",
  pill: "999px",
  card: "22px",
  input: "16px",
  button: "18px",
} as const;

// Standardized shadow tokens
export const shadows = {
  soft: "0 1px 3px rgba(0,0,0,0.35)",
  glow: "none",
  glowInner: "none",
  card: "0 2px 8px rgba(0,0,0,0.4)",
  dock: "0 -2px 10px rgba(0,0,0,0.45)",
} as const;

export const gradients = {
  card: "none",
  accent: "none",
  accentFill: "none",
} as const;

// Standardized spacing tokens
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px", // Standardized section gap and card padding
  xl: "20px",
  "2xl": "24px",
  "3xl": "32px",
  // Semantic spacing
  pagePadX: "16px", // Mobile page padding
  pagePadXLg: "20px", // >= 480px page padding
  sectionGap: "16px", // Gap between sections
  cardPad: "16px", // Standardized card padding
} as const;

// Standardized typography tokens
export const typography = {
  pageTitle: {
    fontSize: "32px",
    fontWeight: 700,
    lineHeight: "1.2",
    letterSpacing: "-0.02em",
    fontFamily: "\"Speed\", \"Speed 2\", \"Space Grotesk\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: 600,
    lineHeight: "1.3",
    color: colors.muted,
  },
  cardTitle: {
    fontSize: "15px",
    fontWeight: 600,
    lineHeight: "1.3",
  },
  metricValue: {
    fontSize: "30px",
    fontWeight: 700,
    lineHeight: "1.2",
  },
  smallLabel: {
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "1.4",
    color: colors.muted,
  },
  title: {
    fontSize: "24px",
    fontWeight: 700,
    lineHeight: "1.2",
    fontFamily: "\"Speed\", \"Speed 2\", \"Space Grotesk\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  },
  body: {
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "1.5",
  },
  muted: {
    fontSize: "12px",
    fontWeight: 400,
    lineHeight: "1.4",
    color: colors.muted,
  },
  small: {
    fontSize: "11px",
    fontWeight: 400,
    lineHeight: "1.4",
  },
} as const;

