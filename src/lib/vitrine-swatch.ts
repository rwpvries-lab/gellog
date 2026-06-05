import { BASE_TOKENS, DRIZZLE_TOKENS, CRUMBLE_TOKENS } from "@/src/lib/gelato-tokens";
import type { BaseToken, DrizzleToken, CrumbleToken } from "@/src/lib/gelato-tokens";

/** The gelato token fields needed to derive a flavour's swatch colour. */
export type VitrineSwatchTokens = {
  base_token?: string | null;
  drizzle_token?: string | null;
  crumble_token?: string | null;
};

/** HSL lightness (0–1) of a #rrggbb hex. */
function hexLightness(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255;
}

/** Near-white = lightness > 90% (catches coconut-white #F8F4EA, cream, etc.). */
function isNearWhite(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex) && hexLightness(hex) > 0.9;
}

/**
 * Swatch colour for a vitrine flavour: prefer the base, but when the base is
 * near-white fall back to the drizzle, then the crumble — so flavours whose
 * character lives in the swirl (e.g. "Mango yogurt": coconut-white + mango-swirl)
 * don't render as a blank dot. If all are near-white/absent, keep the base.
 *
 * Returns `null` when there are no usable tokens, so callers can fall back to a
 * stored/legacy colour.
 */
export function resolveVitrineSwatch(row: VitrineSwatchTokens): string | null {
  const baseHex = row.base_token
    ? (BASE_TOKENS[row.base_token as BaseToken]?.hex ?? null)
    : null;
  if (!baseHex) return null;
  if (!isNearWhite(baseHex)) return baseHex;

  const drizzle = (row.drizzle_token ?? "none") as DrizzleToken;
  const drizzleStroke = DRIZZLE_TOKENS[drizzle]?.stroke;
  if (
    drizzle !== "none" &&
    drizzleStroke &&
    drizzleStroke !== "transparent" &&
    !isNearWhite(drizzleStroke)
  ) {
    return drizzleStroke;
  }

  const crumble = (row.crumble_token ?? "none") as CrumbleToken;
  const crumbleFill = CRUMBLE_TOKENS[crumble]?.fill;
  if (
    crumble !== "none" &&
    crumbleFill &&
    crumbleFill !== "transparent" &&
    crumbleFill !== "mixed" &&
    !isNearWhite(crumbleFill)
  ) {
    return crumbleFill;
  }

  return baseHex;
}
