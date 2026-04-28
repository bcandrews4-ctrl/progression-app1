import React, { useState } from "react";
import { radii, shadows, spacing } from "../styles/tokens";
import { useTheme } from "../hooks/useTheme";
import { BottomSheet } from "./BottomSheet";
import {
  Zap, Flame, Trophy, Dumbbell, Activity, Users, Heart, Lock,
  Star, TrendingUp, Award,
} from "lucide-react";

interface Badge {
  id: number;
  name: string;
  desc: string;
  cat: string;
  earned: boolean;
  icon: string;
  date?: string;
  progress?: { cur: number; max: number; unit?: string };
}

const ALL_BADGES: Badge[] = [
  { id: 1,  name: "First Blood",      desc: "Log your first workout",            cat: "Lifts",     earned: true,  icon: "zap",      date: "Jan 12" },
  { id: 2,  name: "7-Day Streak",     desc: "Train 7 days in a row",            cat: "Streaks",   earned: true,  icon: "flame",    date: "Feb 2"  },
  { id: 3,  name: "100 Club",         desc: "Squat 100kg for the first time",   cat: "Lifts",     earned: true,  icon: "trophy",   date: "Feb 15" },
  { id: 4,  name: "Iron Will",        desc: "Complete 20 workouts",             cat: "Lifts",     earned: true,  icon: "dumbbell", date: "Mar 1"  },
  { id: 5,  name: "Strava Runner",    desc: "Import your first Strava run",     cat: "Running",   earned: true,  icon: "star",     date: "Mar 10" },
  { id: 6,  name: "Steady Pace",      desc: "Run 5 times in one month",         cat: "Running",   earned: true,  icon: "trending", date: "Mar 28" },
  { id: 7,  name: "Cardio King",      desc: "Hit 20 cal in a single effort",    cat: "Cardio",    earned: true,  icon: "activity", date: "Apr 5"  },
  { id: 8,  name: "Hyped Up",         desc: "Log 5 community workouts",         cat: "Community", earned: true,  icon: "users",    date: "Apr 14" },
  { id: 9,  name: "30-Day Streak",    desc: "Train 30 days in a row",           cat: "Streaks",   earned: false, icon: "flame",    progress: { cur: 12, max: 30 } },
  { id: 10, name: "Double Plate",     desc: "Deadlift 200kg",                   cat: "Lifts",     earned: false, icon: "award",    progress: { cur: 163, max: 200, unit: "kg" } },
  { id: 11, name: "Sub-4 Mile",       desc: "Run a sub-4 minute km pace",       cat: "Running",   earned: false, icon: "trending", progress: { cur: 3, max: 5 } },
  { id: 12, name: "Marathon Man",     desc: "Log 100km total running",          cat: "Running",   earned: false, icon: "trending", progress: { cur: 38, max: 100, unit: "km" } },
  { id: 13, name: "Sleep King",       desc: "Log 8h+ sleep 7 nights in a row", cat: "Streaks",   earned: false, icon: "heart",    progress: { cur: 3, max: 7 } },
  { id: 14, name: "Community Pillar", desc: "Get 10 reactions on your posts",  cat: "Community", earned: false, icon: "users",    progress: { cur: 7, max: 10 } },
];

const CATS = ["All", "Lifts", "Cardio", "Running", "Streaks", "Community"];
const RECENT_IDS = [8, 7, 6];

function BadgeIcon({ name, size, color }: { name: string; size: number; color: string }) {
  const props = { size, color, strokeWidth: 1.8 };
  switch (name) {
    case "zap":      return <Zap {...props} />;
    case "flame":    return <Flame {...props} />;
    case "trophy":   return <Trophy {...props} />;
    case "dumbbell": return <Dumbbell {...props} />;
    case "activity": return <Activity {...props} />;
    case "users":    return <Users {...props} />;
    case "heart":    return <Heart {...props} />;
    case "award":    return <Award {...props} />;
    case "trending": return <TrendingUp {...props} />;
    default:         return <Star {...props} />;
  }
}

interface BadgesScreenProps {
  accentColor?: string;
}

export function BadgesScreen({ accentColor }: BadgesScreenProps) {
  const { c } = useTheme();
  const accent = accentColor || c.accent;

  const [cat, setCat] = useState("All");
  const [selected, setSelected] = useState<Badge | null>(null);

  const earned = ALL_BADGES.filter((b) => b.earned);
  const filtered = ALL_BADGES.filter((b) => cat === "All" || b.cat === cat);
  const recent = ALL_BADGES.filter((b) => RECENT_IDS.includes(b.id));
  const pct = Math.round((earned.length / ALL_BADGES.length) * 100);

  return (
    <div style={{ overflowY: "auto", height: "100%", paddingBottom: "24px" }}>
      <div style={{ padding: "16px 16px 0" }}>
        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "30px", fontWeight: 700, color: c.text, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Achievements
          </div>
          <div style={{ fontSize: "13px", color: c.muted, marginTop: "4px" }}>
            {earned.length}/{ALL_BADGES.length} earned
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", borderRadius: "3px", background: accent, transition: "width 0.5s ease" }} />
          </div>
          <div style={{ fontSize: "11px", color: c.muted, marginTop: "5px" }}>{pct}% complete</div>
        </div>

        {/* Recently earned */}
        <div style={{ marginBottom: "18px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: c.muted2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
            Recently earned
          </div>
          <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none" }}>
            {recent.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelected(b)}
                style={{
                  flexShrink: 0, width: "100px", borderRadius: "14px", padding: "14px 10px",
                  background: c.cardBg2, border: `1px solid ${accent}44`,
                  boxShadow: `0 0 16px ${accent}20`,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                  cursor: "pointer", position: "relative",
                }}
              >
                <div style={{
                  position: "absolute", top: "6px", right: "6px",
                  background: accent, borderRadius: "999px",
                  fontSize: "9px", fontWeight: 700, color: "#fff", padding: "2px 6px",
                }}>
                  New
                </div>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "12px",
                  background: `${accent}18`, border: `1px solid ${accent}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <BadgeIcon name={b.icon} size={20} color={accent} />
                </div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: c.text, textAlign: "center", lineHeight: 1.2 }}>
                  {b.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "6px", marginBottom: "14px", scrollbarWidth: "none" }}>
          {CATS.map((catName) => (
            <button
              key={catName}
              onClick={() => setCat(catName)}
              style={{
                flexShrink: 0, padding: "7px 14px", borderRadius: radii.pill, fontSize: "13px", fontWeight: 500,
                background: cat === catName ? accent : c.cardBg2,
                border: `1px solid ${cat === catName ? accent : c.border}`,
                color: cat === catName ? "#fff" : c.muted,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {catName}
            </button>
          ))}
        </div>

        {/* Badge grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "24px" }}>
          {filtered.map((b) => (
            <div
              key={b.id}
              onClick={() => setSelected(b)}
              style={{
                borderRadius: "16px", padding: "16px 12px",
                background: b.earned ? c.cardBg2 : c.card,
                border: `1px solid ${b.earned ? `${accent}40` : c.border}`,
                boxShadow: b.earned ? `0 0 18px ${accent}12` : "none",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
                cursor: "pointer", transition: "all 0.15s", position: "relative",
                filter: b.earned ? "none" : "brightness(0.7)",
              }}
            >
              <div style={{
                width: "52px", height: "52px", borderRadius: "14px",
                background: b.earned ? `${accent}20` : "rgba(255,255,255,0.06)",
                border: `1px solid ${b.earned ? `${accent}55` : "rgba(255,255,255,0.1)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}>
                <BadgeIcon name={b.icon} size={26} color={b.earned ? accent : c.muted2} />
                {!b.earned && (
                  <div style={{
                    position: "absolute", bottom: "-4px", right: "-4px",
                    width: "18px", height: "18px", borderRadius: "50%",
                    background: c.cardBg2, border: `1px solid ${c.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Lock size={9} color={c.muted2} strokeWidth={2} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: b.earned ? c.text : c.muted, textAlign: "center", lineHeight: 1.3, width: "100%" }}>
                {b.name}
              </div>
              <div style={{ fontSize: "11px", color: c.muted, textAlign: "center", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", width: "100%" }}>
                {b.desc}
              </div>
              {!b.earned && b.progress && (
                <div style={{ width: "100%" }}>
                  <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: "2px", background: "rgba(255,255,255,0.3)", width: `${Math.min(100, (b.progress.cur / b.progress.max) * 100)}%` }} />
                  </div>
                  <div style={{ fontSize: "10px", color: c.muted2, textAlign: "center", marginTop: "4px" }}>
                    {b.progress.cur}/{b.progress.max}{b.progress.unit ? ` ${b.progress.unit}` : ""}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Badge detail sheet */}
      <BottomSheet open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div style={{ textAlign: "center", paddingBottom: "8px" }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "18px", margin: "0 auto 14px",
              background: selected.earned ? `${accent}18` : "rgba(255,255,255,0.05)",
              border: `1px solid ${selected.earned ? `${accent}44` : c.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              filter: selected.earned ? "none" : "grayscale(0.6)",
            }}>
              <BadgeIcon name={selected.icon} size={32} color={selected.earned ? accent : c.muted2} />
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: c.text, marginBottom: "6px" }}>{selected.name}</div>
            <div style={{ fontSize: "14px", color: c.muted, marginBottom: "16px" }}>{selected.desc}</div>
            <div style={{
              padding: "12px", borderRadius: "12px", background: "rgba(255,255,255,0.04)",
              border: `1px solid ${c.border}`, marginBottom: "16px", textAlign: "left",
            }}>
              {selected.earned ? (
                <>
                  <div style={{ fontSize: "12px", color: c.muted2, marginBottom: "4px" }}>Earned on</div>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: c.text }}>{selected.date}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "12px", color: c.muted2, marginBottom: "8px" }}>Progress to unlock</div>
                  {selected.progress && (
                    <>
                      <div style={{ height: "6px", borderRadius: "3px", background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: "6px" }}>
                        <div style={{
                          height: "100%", borderRadius: "3px", background: accent,
                          width: `${Math.min(100, (selected.progress.cur / selected.progress.max) * 100)}%`,
                        }} />
                      </div>
                      <div style={{ fontSize: "13px", color: c.muted }}>
                        {selected.progress.cur} / {selected.progress.max}{selected.progress.unit ? ` ${selected.progress.unit}` : ""}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{
                width: "100%", height: "44px", borderRadius: radii.pill,
                background: "transparent", border: `1px solid ${c.borderMid}`,
                color: c.text, fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Close
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
