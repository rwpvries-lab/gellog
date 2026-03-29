"use client";

import { useEffect, useState } from "react";

// ─── Light mode tokens ────────────────────────────────────────────────────────

const light = {
  primaryOrange:  "#FD7706",
  primaryTeal:    "#3D948B",

  orangeLightBg:  "#FEF3E7",
  tealLightBg:    "#EEF7F6",

  surface:        "#F9F9F9",
  surfaceAlt:     "#F4F4F5",
  surfaceTinted:  "#F0F9F8",

  borderDefault:  "#E5E7EB",
  borderStrong:   "#D1D5DB",

  textPrimary:    "#111827",
  textSecondary:  "#6B7280",
  textTertiary:   "#9CA3AF",

  destructive:    "#DC2626",
} as const;

// ─── Dark mode tokens ─────────────────────────────────────────────────────────

const dark = {
  primaryOrange:  "#F97316",
  primaryTeal:    "#2A9D8F",

  orangeLightBg:  "#291A09",
  tealLightBg:    "#042F2E",

  surface:        "#1C1C1E",
  surfaceAlt:     "#2C2C2E",
  surfaceTinted:  "#1A2B2B",

  borderDefault:  "#3A3A3C",
  borderStrong:   "#48484A",

  textPrimary:    "#F9F9F9",
  textSecondary:  "#AEAEB2",
  textTertiary:   "#6B7280",

  destructive:    "#F87171",
} as const;

// ─── Shared tokens ────────────────────────────────────────────────────────────

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "15px",
  xl: "20px",
} as const;

export const shadow = {
  card: "0 1px 2px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme = typeof light;

// ─── useTheme hook ────────────────────────────────────────────────────────────

function getIsDark(): boolean {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function useTheme(): Theme {
  const [isDark, setIsDark] = useState(getIsDark);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark ? dark : light;
}

export { light as lightTokens, dark as darkTokens };
