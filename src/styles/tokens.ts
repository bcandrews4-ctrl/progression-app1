// Design Tokens - Premium Futuristic UI
export const colors = {
  bg: "#000000",
  text: "#FFFFFF",
  muted: "rgba(255,255,255,0.65)",
  cardBg: "rgba(255,255,255,0.04)",
  cardBg2: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.08)",
  accent: "#0000FF",
  accentGlow: "rgba(0,0,255,0.35)",
  accentSoft: "rgba(0,0,255,0.12)",
  accentBorder: "rgba(0,0,255,0.45)",
} as const;

export const radii = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "28px",
  full: "9999px",
} as const;

export const shadows = {
  soft: "0 2px 8px rgba(0,0,0,0.3)",
  glow: "0 0 24px rgba(0,0,255,0.35)",
  glowInner: "inset 0 0 0 1px rgba(0,0,255,0.45)",
  card: "0 4px 16px rgba(0,0,0,0.4)",
  dock: "0 -4px 24px rgba(0,0,0,0.5)",
} as const;

export const gradients = {
  card: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
  accent: "linear-gradient(180deg, rgba(0,0,255,0.25) 0%, rgba(0,0,255,0) 100%)",
  accentFill: "linear-gradient(180deg, rgba(0,0,255,0.15) 0%, rgba(0,0,255,0.05) 100%)",
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "32px",
} as const;

export const typography = {
  title: {
    fontSize: "24px",
    fontWeight: 600,
    lineHeight: "1.2",
    fontFamily: "\"Speed 2\", \"Speed\", \"Space Grotesk\", ui-sans-serif, system-ui, sans-serif",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 600,
    lineHeight: "1.3",
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

