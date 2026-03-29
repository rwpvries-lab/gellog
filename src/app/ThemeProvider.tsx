"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = localStorage.getItem("gellog-theme") as ThemeMode | null;
    setModeState(stored === "light" || stored === "dark" ? stored : "system");
  }, []);

  useEffect(() => {
    const apply = () => {
      const root = document.documentElement;
      root.classList.remove("dark", "light");
      root.classList.add(resolveIsDark(mode) ? "dark" : "light");
    };

    apply();

    if (mode === "system") {
      localStorage.removeItem("gellog-theme");
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    } else {
      localStorage.setItem("gellog-theme", mode);
    }
  }, [mode]);

  function setMode(next: ThemeMode) {
    setModeState(next);
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeToggle(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeToggle must be used within ThemeProvider");
  return ctx;
}
