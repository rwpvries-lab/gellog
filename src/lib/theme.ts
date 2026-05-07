"use client";

import { useEffect, useState } from "react";

// ─── Token type ───────────────────────────────────────────────────────────────

export type ThemeTokens = {
  readonly backgroundPrimary: string;
  readonly backgroundSecondary: string;
  readonly backgroundTertiary: string;
  readonly surfaceElevated: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textTertiary: string;
  readonly textInverse: string;
  readonly brandPrimary: string;
  readonly brandPrimaryHover: string;
  readonly brandPrimaryActive: string;
  readonly brandPrimaryMuted: string;
  readonly brandPrimarySurface: string;
  readonly brandSecondary: string;
  readonly brandSecondaryHover: string;
  readonly brandSecondaryMuted: string;
  readonly borderDefault: string;
  readonly borderStrong: string;
  readonly borderFocus: string;
  readonly stateSuccess: string;
  readonly stateWarning: string;
  readonly stateError: string;
  readonly stateInfo: string;
  readonly starFilled: string;
  readonly starEmpty: string;
};

// ──────────────────────────────────────────────────────────────────
// FORBIDDEN TOKEN PAIRINGS (do not use — fail WCAG by design)
//
//   text.inverse on background.* / surface.elevated  → use text.primary
//   text.primary on brand.secondary                  → use text.inverse
//   text.secondary on brand.primary / brand.secondary → use text.inverse
//   text.tertiary on brand.primary                   → use text.inverse
//   text.inverse on brand.primaryMuted               → use text.primary
//
// text.inverse is the colour for text ON solid brand colours.
// It is NEVER for text on light backgrounds.
// ──────────────────────────────────────────────────────────────────
// ─── Light mode tokens ────────────────────────────────────────────────────────

const light: ThemeTokens = {
  backgroundPrimary:  "#FBF5E8",
  backgroundSecondary:"#F5EEDC",
  backgroundTertiary: "#EFE7CC",
  surfaceElevated:    "#FFFFFF",
  textPrimary:        "#2E1A16",
  textSecondary:      "#6B5F58",
  textTertiary:       "#7B6E5D",
  textInverse:        "#FBF5E8",
  brandPrimary:       "#A85530",
  brandPrimaryHover:  "#9A4B28",
  brandPrimaryActive: "#894322",
  brandPrimaryMuted:  "#E3B396",
  brandPrimarySurface:"#F5E0CF",
  brandSecondary:     "#1B5E52",
  brandSecondaryHover:"#144A41",
  brandSecondaryMuted:"#D6E9DF",
  borderDefault:      "#E2D9D0",
  borderStrong:       "#B8AFA3",
  borderFocus:        "#C96F39",
  stateSuccess:       "#5C8A4E",
  stateWarning:       "#D89A3F",
  stateError:         "#B4513E",
  stateInfo:          "#1B5E52",
  starFilled:         "#C96F39",
  starEmpty:          "#E2D9D0",
};

// ─── Dark mode tokens ─────────────────────────────────────────────────────────

const dark: ThemeTokens = {
  backgroundPrimary:  "#1F1411",
  backgroundSecondary:"#2A1D18",
  backgroundTertiary: "#352822",
  surfaceElevated:    "#3D3025",
  textPrimary:        "#FBF5E8",
  textSecondary:      "#CBB8A6",
  textTertiary:       "#A37E6E",
  textInverse:        "#2E1A16",
  brandPrimary:       "#E08A5F",
  brandPrimaryHover:  "#EE9D72",
  brandPrimaryActive: "#E08A5F",
  brandPrimaryMuted:  "#A4332D",
  brandPrimarySurface:"#A4332D",
  brandSecondary:     "#4FA391",
  brandSecondaryHover:"#4FA391",
  brandSecondaryMuted:"#2D7472",
  borderDefault:      "#4A3D3E",
  borderStrong:       "#6A5C46",
  borderFocus:        "#E08A5F",
  stateSuccess:       "#5C8A4E",
  stateWarning:       "#D89A3F",
  stateError:         "#B4513E",
  stateInfo:          "#1B5E52",
  starFilled:         "#E08A5F",
  starEmpty:          "#4A3D3E",
};

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

export const typography = {
  display: {
    hero:
      "font-serif text-[54px] leading-[1.05] font-semibold tracking-[-0.02em]",
    large: "font-serif text-[28px] leading-[1.2] font-semibold",
    medium: "font-serif text-[24px] leading-[1.25] font-medium",
  },
  heading: {
    md: "font-serif text-[20px] leading-[1.3] font-medium",
  },
  body: {
    large: "font-sans text-[16px] leading-[1.5] font-normal",
    default: "font-sans text-[14px] leading-[1.5] font-normal",
    small: "font-sans text-[13px] leading-[1.45] font-normal",
  },
  caption:
    "font-sans text-[12px] leading-[1.2] font-medium uppercase tracking-[0.08em]",
  stat: {
    number: "font-sans text-[28px] leading-[1.15] font-bold",
  },
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

/** @deprecated Use ThemeTokens instead */
export type Theme = ThemeTokens;

// ─── useTheme hook ────────────────────────────────────────────────────────────

function getIsDark(): boolean {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function useTheme(): ThemeTokens {
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
