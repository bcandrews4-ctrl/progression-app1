import { createContext, useContext, useEffect, useState } from "react";
import { colors, lightColors } from "../styles/tokens";

type Theme = "dark" | "light";

type ColorSet = typeof colors | typeof lightColors;

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  c: ColorSet;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
  isDark: true,
  c: colors as ColorSet,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("hh_theme") as Theme) || "dark";
  });

  const isDark = theme === "dark";
  const c = isDark ? colors : lightColors;

  useEffect(() => {
    localStorage.setItem("hh_theme", theme);
    document.body.style.background = c.bg;
  }, [theme, c.bg]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark, c }}>
      {children}
    </ThemeContext.Provider>
  );
}
