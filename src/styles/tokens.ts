// Design Tokens - Premium Futuristic UI
// Single source of truth for consistent design system

export const colors = {
  bg: "#000000",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.65)",
  surface: "rgba(255,255,255,0.05)", // Standardized surface color
  cardBg: "rgba(255,255,255,0.04)",
  cardBg2: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  accent: "#0000FF",
  accentGlow: "rgba(0,0,255,0.35)",
  accentSoft: "rgba(0,0,255,0.12)",
  accentBorder: "rgba(0,0,255,0.45)",
} as const;

// Standardized radius tokens
export const radii = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "22px", // Standardized card radius
  "3xl": "28px",
  full: "999px", // Standardized chip/pill radius
  card: "22px", // Alias for card-radius
  input: "16px", // Standardized input radius
  button: "18px", // Standardized button radius
} as const;

// Standardized shadow tokens
export const shadows = {
  soft: "0 2px 8px rgba(0,0,0,0.3)",
  glow: "0 0 24px rgba(0,0,255,0.25)", // Standardized glow
  glowInner: "inset 0 0 0 1px rgba(0,0,255,0.45)",
  card: "0 12px 40px rgba(0,0,0,0.6)", // Standardized card shadow
  dock: "0 -4px 24px rgba(0,0,0,0.5)",
} as const;

export const gradients = {
  card: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
  accent: "linear-gradient(180deg, rgba(0,0,255,0.25) 0%, rgba(0,0,255,0) 100%)",
  accentFill: "linear-gradient(180deg, rgba(0,0,255,0.15) 0%, rgba(0,0,255,0.05) 100%)",
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
    fontSize: "30px", // 28-32px range
    fontWeight: 700,
    lineHeight: "1.2",
    letterSpacing: "-0.02em", // Slightly negative
    fontFamily: "\"Speed 2\", \"Speed\", \"Space Grotesk\", ui-sans-serif, system-ui, sans-serif",
  },
  sectionTitle: {
    fontSize: "15px", // 14-16px range
    fontWeight: 600,
    lineHeight: "1.3",
    color: colors.muted,
  },
  cardTitle: {
    fontSize: "15px", // 14-16px range
    fontWeight: 600,
    lineHeight: "1.3",
  },
  metricValue: {
    fontSize: "32px", // 28-36px range
    fontWeight: 700,
    lineHeight: "1.2",
  },
  smallLabel: {
    fontSize: "12.5px", // 12-13px range
    fontWeight: 400,
    lineHeight: "1.4",
    color: colors.muted,
  },
  // Legacy support
  title: {
    fontSize: "24px",
    fontWeight: 600,
    lineHeight: "1.2",
    fontFamily: "\"Speed 2\", \"Speed\", \"Space Grotesk\", ui-sans-serif, system-ui, sans-serif",
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

